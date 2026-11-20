---
name: debug-failure
description: Investigate a failing Playwright test using artifacts, logs and a targeted rerun, and report the root cause before changing code. Use when a test fails or is flaky.
allowed-tools: Read, Grep, Glob, Edit(harness-results/failures/**), Bash(git diff *), Bash(git status *), Bash(git log *), Bash(yarn harness:run-tests *), Bash(yarn harness:check-failure-report *), mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_close
---

# Debug a Failing Test

Input: `[--report <path>] [--project <browser project>] <test title>` — the project defaults to `Desktop Chromium`; the title is the full
title including the tag (e.g. `@Smoke | Test Credit Card Checkout`). Interactive: ask for the title if it is missing.

Follow this order and stop at the first step that explains the failure. Report the root cause **before** changing any code.
This skill only diagnoses: it never edits repository files.

**Headless mode** (`--report <path>`, used by `yarn agent:execute`): never ask the user; write the JSON report described under *Report*
to `<path>` (must be under `harness-results/failures/`) and no other file; then run `yarn harness:check-failure-report <path>` and fix the
report until it passes; finish with one line: category, root cause, report path. When something would need a human decision (root cause
in the self-healing pipeline, missing information), say so in `rootCause` / `proposedFix` instead of asking.

## 0. Run outcome and freshness
- **Summary first:** if `harness-results/summary.json` exists and its `run.startedAt` matches the run under investigation, start from the test's entry: `status`, `error`, `failedStep`, `healing` (outcome, reason, `aiResponse`), `artifacts`, `log`, `trace`, and `sourceChanges` for healing patches.
- **Stale inputs:** artifacts are overwritten per test but never cleared, and the log file is appended to. Compare `metadata.json` `timestamp` (and file mtimes) with the run under investigation; if they are older, they belong to a previous run. Log lines carry an ISO `timestamp` to match them to the run. Run `yarn harness:clean` and rerun (step 5) before trusting stale inputs.
- **Self-healed run:** the test can end as *passed* after healing. Signs: console `[HealingEngine] HEALED on attempt N | <old> → <new>` / `Self-healing succeeded`, a `self-healed` annotation in the report, a `<Component>.ts.bak` next to the component, and a source change in `git diff`. In that case there is no `test-results/*/error-context.md`; use `metadata.json` + `ai-response.json`, and report the patch (`git diff` of the component, or diff against the `.bak`). Leave the `.bak` until the patch has been reviewed.

## 1. Locator — artifacts
Folder: `artifacts/{browser}/{test_title}/` (title with non-word characters replaced by `_`, e.g. `_Smoke_Test_Standard_Component`). File names come from `config/framework.config.ts`:
- `screenshot.png` — look at it
- `dom.html` — check whether the failed locator exists and what replaced it
- `metadata.json` — failed locator, error, URL, failure source (ACTION / ASSERTION)
- `ai-response.json` — the self-healing analysis (root cause, patch, confidence), if healing ran
- `component.ts` — the source the analysis was based on
Also read `test-results/*/error-context.md` for the Playwright error and call log (only present when the test finally failed).

## 2. Logs
`logs/{browser}.{name}.log` (Winston, one file per browser + test), where `{name}` is the part of the title after the last `|`, trimmed, spaces replaced by `_` (see `utils/LoggerManager.ts`), e.g. `logs/Desktop Chromium.Test_Standard_Component.log`.

## 3. Test data
Check the JSON behind `testData.<key>` in `test-data/{env}/` and the active `TEST_ENV` (default `sit`).

## 4. Component action
Is the wrapped method correct (right locator, right action, awaited, inside `withHealing()` for CSS/XPath)?

## 5. Application behavior
Does the app actually behave as the test expects? Reproduce with a single rerun through the agent runner (self-healing off, so the
rerun never patches source or calls OpenAI): `yarn harness:run-tests <spec file> --grep "<title, regex-escaped>$"` (escape
`. * + ? ^ $ { } ( ) | [ ] \` — the title contains `|`). The result is `harness-results/tests/<timestamp>.json`. It always runs
`Desktop Chromium`; for another project, report that the rerun was not possible. The real page can also be inspected read-only with the
Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_close`) as a guest.

## 6. Environment and configuration
Browser project, env var names (never read `.env*` — the guard hook blocks it), `TEST_ENV`, `playwright.config.web.js`, `config/framework.config.ts`.

## Rules
- Do not assume the test is wrong before finishing the investigation.
- Never bypass `withHealing()`, change assertion expected values, or add `waitForTimeout` to make a test pass.
- Do not modify the self-healing pipeline; if the root cause is there, stop and ask (headless: record it in the report).
- Never edit repository files; propose the fix instead.
- Report: failing step, evidence (file + excerpt), root cause category (locator / data / component / app / environment / config), the healing outcome (HEALED / MANUAL / FAILED / DISABLED / SKIPPED / NONE, with any source patch), and the proposed fix.

## Report (headless mode)

One JSON object, project-relative paths, no secrets (emails, card numbers, credential values are rejected by the checker — mask them):

```json
{
  "test": { "title": "<full title>", "file": "tests/web/<spec>.spec.ts", "project": "Desktop Chromium" },
  "run": { "summary": "harness-results/summary.json", "startedAt": "<run.startedAt>" },
  "error": "<first lines of the Playwright error>",
  "failedStep": { "title": "<step>", "location": "<file>:<line>" },
  "category": "locator | data | component | app | environment | config",
  "rootCause": "<what is wrong and why, 1–4 sentences>",
  "evidence": [{ "file": "<existing file>", "excerpt": "<relevant lines>", "note": "<optional>" }],
  "healing": { "outcome": "HEALED | MANUAL | FAILED | DISABLED | SKIPPED | NONE", "reason": "<optional>", "aiResponse": "<optional path>", "patch": { "file": "<path>", "diff": "<git diff>" } },
  "rerun": { "result": "harness-results/tests/<timestamp>.json", "status": "<status>" },
  "proposedFix": { "summary": "<the change>", "files": ["<paths>"], "needsRequirement": true },
  "confidence": 0,
  "stepsVisited": [0]
}
```

- Required: `test`, `error`, `category`, `rootCause`, `evidence` (at least one, each `file` must exist), `healing.outcome`, `proposedFix.summary`,
  `confidence` (integer 0–100), `stepsVisited` (the sections above you went through, ascending, 0–6). Leave out optional fields you have no
  value for; `rerun` only when you reran.
- `test`, `error`, `failedStep`, `healing`, `run` come from the test's entry in `harness-results/summary.json` when it matches the run.
- `proposedFix.needsRequirement` is `true` when the fix changes framework or test code (it goes through requirement → plan), `false` when it
  is environmental (e.g. the app was down).
