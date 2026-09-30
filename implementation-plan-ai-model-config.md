# Implementation Plan: Move All AI Model Configuration to `.env`

## Objective

Separate the OpenAI model used by each AI feature and manage all of them from `.env`:

| Feature | Model | Env variable |
|---|---|---|
| Self-healing failure analysis (`ai/FailureAnalyzer.ts`) | `gpt-5-mini` (unchanged) | `OPEN_ANALYSIS_MODEL` (**new**) |
| Implementation-plan review (`ai/review.ts`) | `gpt-5.3-codex` (**changed**) | `OPEN_REVIEW_MODEL` (renamed from `OPEN_MODEL`) |

`config/ai.config.ts` is deleted — `.env` becomes the single source of AI model/key configuration.
`imageDetail` (a tuning constant, not an environment setting) moves to `config/framework.config.ts`.

---

## Current State

| File | What it holds | Used by |
|---|---|---|
| `config/ai.config.ts` | `apiKey` (from env), `model: "gpt-5-mini"` (hardcoded), `imageDetail: "high"` (hardcoded) + import-time `OPEN_API_KEY` check | `ai/FailureAnalyzer.ts` only (`aiConfig.model`, `aiConfig.imageDetail`) |
| `ai/aiClient.ts` | OpenAI client from `process.env.OPEN_API_KEY` + import-time key check | `FailureAnalyzer.ts` |
| `ai/review.ts` | Own OpenAI client, model from `process.env.OPEN_MODEL` | standalone CLI (`yarn ai:review`) |
| `.env` | `OPEN_MODEL=gpt-5-mini`, `OPEN_API_KEY=...` | both |

Notes:
- `aiConfig.apiKey` is never read — `aiClient.ts` already reads the key from env. Deleting it loses nothing.
- The `OPEN_API_KEY` import-time check in `ai.config.ts` is duplicated by `aiClient.ts` — still covered after deletion.

---

## Target `.env`

```dotenv
OPEN_API_KEY=...
OPEN_ANALYSIS_MODEL=gpt-5-mini
OPEN_REVIEW_MODEL=gpt-5.3-codex
```

`OPEN_MODEL` is removed.

---

## Changes

### 1. `ai/FailureAnalyzer.ts`

- Remove `import { aiConfig } from "../config/ai.config.js";`
- Add `import "dotenv/config";` (same pattern as `aiClient.ts` / `review.ts`).
- Add module-level config read + fail-fast validation (keeps the current import-time failure behaviour of `ai.config.ts`):

```typescript
const analysisModel = process.env.OPEN_ANALYSIS_MODEL;
if (!analysisModel) {
    throw new Error("OPEN_ANALYSIS_MODEL is missing from .env");
}
```

- `model: aiConfig.model` → `model: analysisModel`
- `detail: aiConfig.imageDetail` → `detail: frameworkConfig.imageDetail`

### 1b. `config/framework.config.ts`

- Add `imageDetail: "high" as const`.

No other change: prompt, request shape, JSON parsing and artifact writing stay the same.

### 2. `config/ai.config.ts`

- **Delete** the file.

### 3. `ai/review.ts`

- `ensureEnvironment()`: check `OPEN_REVIEW_MODEL` instead of `OPEN_MODEL`;
  error message → `"OPEN_REVIEW_MODEL is missing from .env"`.
- `client.responses.create({ model: process.env.OPEN_REVIEW_MODEL!, ... })`.
- Already uses the Responses API, which is required by Codex models — no request change needed.

### 4. `.env` (local, git-ignored)

- Replace `OPEN_MODEL=gpt-5-mini` with the two new variables shown in **Target `.env`**.

### 5. CI secret `ENV_FILE_BASE64` — **required**

Self-healing runs in CI (`smoke-github-hosted.yml`, `smoke-github-hosted-matrix.yml`, `smoke-self-hosted.yml`
all decode `ENV_FILE_BASE64` into `.env`). Once `ai.config.ts` is deleted, a CI `.env` without
`OPEN_ANALYSIS_MODEL` makes `FailureAnalyzer.ts` throw at import → every spec importing the healing
chain fails.

- Regenerate: `base64 -i .env | pbcopy` → update the `ENV_FILE_BASE64` repository secret
  **before** merging this change.
- Workflow files themselves need no change.

### 6. `CLAUDE.md`

- **AI Self-Healing → Rules**: replace
  "Do not change the OpenAI model in `config/ai.config.ts` …" with
  "Do not change `OPEN_ANALYSIS_MODEL` in `.env` or the system prompt in
  `ai/prompts/FailureAnalysisPrompt.ts` without explicit instruction."
- **AI Review Tool**:
  - "Uses `OPEN_API_KEY` and `OPEN_REVIEW_MODEL` from `.env` (currently `gpt-5.3-codex`)".
  - Fix run command: `npx ts-node ai/review.ts` → `yarn ai:review` (script uses `tsx`).
- **Test Data**: add a line — AI model settings (`OPEN_ANALYSIS_MODEL`, `OPEN_REVIEW_MODEL`)
  are read from `.env` only; never hardcode them.

---

## Self-Healing Impact

- `HealingEngine`, collectors, `Component.withHealing()`, `base.ts`, `AIResponseValidator` threshold,
  `HealingLock`, `BackupManager`, `PatchVerifier`, `TestRerunner` — **untouched**.
- Failure analysis keeps `gpt-5-mini` and `detail: "high"` — behaviour identical when `.env` is set.
- Only difference: config source moves from a TS constant to env. Missing env → import-time error
  (same fail-fast behaviour as today's missing `OPEN_API_KEY`).

---

## Decisions (approved)

| # | Decision | Alternative |
|---|---|---|
| 1 | Variable name `OPEN_ANALYSIS_MODEL` (symmetrical with `OPEN_REVIEW_MODEL`) | `OPEN_FAILURE_ANALYSIS_MODEL` |
| 2 | `imageDetail` moves to `config/framework.config.ts` as `imageDetail: "high"` (tuning value, not an environment setting) | `.env` variable `OPEN_ANALYSIS_IMAGE_DETAIL` — rejected |
| 3 | `OPEN_ANALYSIS_MODEL` is required, no default — a silent default would recreate the hardcoded value | Default to `gpt-5-mini` |
| 4 | Validation lives in `FailureAnalyzer.ts` (its only consumer) | Centralise in `ai/aiClient.ts` |
| 5 | No `.env.example` added (none exists today) | Add one documenting all AI variables |

---

## Verification

1. Confirm the model ID exists for this API key:
   ```bash
   curl -s https://api.openai.com/v1/models -H "Authorization: Bearer $OPEN_API_KEY" | grep -o '"id": *"gpt-5.3-codex"'
   ```
2. `npx tsc --noEmit` — no remaining imports of `config/ai.config`.
3. `grep -rn "ai.config\|aiConfig\|OPEN_MODEL\b" --exclude-dir=node_modules .` → no hits (except history docs).
4. Review tool: copy this plan to `implementation-plan.md` (the tool only reads that file) and run
   `yarn ai:review` → `implementation-review/openai-review.md` is produced; check `response.model` reports `gpt-5.3-codex`.
5. Failure analysis: temporarily break one CSS locator in a component, run that spec →
   `artifacts/.../ai-response.json` is produced (analysis ran with `gpt-5-mini`); restore the locator.
6. Negative check: remove `OPEN_ANALYSIS_MODEL` from `.env` → run a spec → clear
   `OPEN_ANALYSIS_MODEL is missing from .env` error; restore it.
7. After updating `ENV_FILE_BASE64`, trigger `smoke-github-hosted.yml` manually and confirm it passes.

---

## Relevant Files

- `ai/FailureAnalyzer.ts`
- `config/ai.config.ts`
- `ai/review.ts`
- `ai/aiClient.ts`
- `CLAUDE.md`
- `.github/workflows/smoke-github-hosted.yml`
- `config/framework.config.ts`
- `package.json`
