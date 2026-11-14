# Implementation Plan: Harness Slice B — Implement → OpenAI Code Review → Revision → Human

Part of `implementation-plans/agent-harness.md` (stages 4–6).

## Objective

An `Approved` plan is implemented by Claude, gated by machine checks, reviewed once by OpenAI, revised by Claude
and handed to the human for code review:

```
yarn agent:implement implementation-plans/<plan>.md
  plan Approved + clean working tree
  → claude -p /implement-plan → gates → Status: Implemented
  → ai:review --mode code      → Status: Code Reviewed
  → claude -p /revise-code     → gates → Status: Awaiting Human Code Review → stop
yarn agent:accept implementation-plans/<plan>.md   (after the human sets Accepted)
```

Gates: `tsc`, `arch-check`, `scope-check`, `--list`, the plan's specs. Code stays uncommitted during Slice B, so
`git diff HEAD` (plus untracked files) is exactly the plan's change.

## Decisions (2026-11-11)

| Topic | Decision |
|---|---|
| Self-healing during agent test runs | Run tests with `SELF_HEALING_DISABLED=true`: healing skipped, failures surface to the agent (revised 2026-11-14, see below) |
| Human send-back at code stage | New status `Code Changes Requested` (lifecycle: … → Awaiting Human Code Review → Code Changes Requested → … → Accepted) |
| Commit after acceptance | `yarn agent:accept <plan>`: requires `Accepted`, re-runs the gates, commits on `main` with a message from the plan, no push |
| Order | B1 → B2 → B3 → B4, each verified on REQ-002 |

### Revision 2026-11-14: separate flag to disable self-healing

The 2026-11-11 decision reused `HEALING_RERUN=true`. That flag means "this process is a rerun spawned by
`TestRerunner`"; disabling healing is only its side effect. Reusing it for agent test runs misleads readers
(the name reads as "healing may rerun") and records a false reason: `HealingEngine` logs
`Skipping — running inside a healing rerun.` and returns `reason: "Recursive healing prevented"`, which would
also end up in the gate results B3 reads.

Change (self-healing pipeline, approved by the human 2026-11-14):

- `ai/HealingEngine.ts` — `handle()` checks a new guard first, before the existing `HEALING_RERUN` guard:
  `if (process.env.SELF_HEALING_DISABLED === "true")` → log `[HealingEngine] Skipping — self-healing disabled for this run.`
  and return `{ status: "SKIPPED", reason: "Self-healing disabled for this run", retryCount: 0 }`. Same position
  as the rerun guard: before the lock, the timeout extension and the retry loop, so `maxHealingRetries` is never
  reached and no OpenAI call or source change happens. Artifact collection still runs (it happens in the
  collectors, before `handle()`).
- `HEALING_RERUN` is unchanged: the guard in `handle()` and the env in `TestRerunner.run()` keep their
  anti-recursion role and their names.
- `.claude/rules/self-healing.md` — lifecycle step 1 lists both guards; Rules add "Never remove the
  `SELF_HEALING_DISABLED` guard"; Outcome Handling unchanged (`SKIPPED` re-throws the original error).
- Test wrapper (B2) sets `SELF_HEALING_DISABLED=true`, not `HEALING_RERUN=true`.

## Sub-slices

- **B1 Guardrails and checks:** `harness/checks/arch-check.ts` (TypeScript compiler API, rules from CLAUDE.md, baseline for existing
  violations), `harness/checks/scope-check.ts` (diff ⊆ Relevant Files), PreToolUse hook (`.env*`, `.auth/` blocked; self-healing
  pipeline files ask).
- **B2 `/implement-plan` skill:** implements Changes by Layer only, runs the gates and the plan's specs (debugging per `/debug-failure`,
  never bypassing `withHealing()`), adds `## Implementation Notes`, sets `Implemented`. Specs run only through
  `yarn harness:run-tests <spec...>` (`harness/agent/run-tests.ts`): always sets `SELF_HEALING_DISABLED=true`,
  `--config=playwright.config.web.js`, `--project="Desktop Chromium"`; writes per-test status, error, artifact and
  log paths to `harness-results/tests/<timestamp>.json` (reused as gate results in B3) and prints a short summary.
  One fixed command, so a single `Bash(yarn harness:run-tests:*)` permission covers it and the flag cannot be omitted.
- **B3 `ai/review.ts --mode code`:** plan + requirement + rules + `git diff HEAD` + changed files + gate results; findings `C<n>` in
  `implementation-review/<plan>.code.json|md`; `plan-check` requires `## Code Review Resolution` to answer every `C<n>`.
- **B4 `/revise-code` + runner:** answers every `C<n>`, re-runs the gates, sets `Awaiting Human Code Review`; `yarn agent:implement`
  (with `--revise` for `Code Changes Requested` + `## Human Code Review Notes`), `yarn agent:accept`; run logs in
  `harness-results/agent-implement/`.

## Verification

1. Gates catch planted violations (CSS locator getter, direct `click()`, file outside Relevant Files).
2. Full run on REQ-002 once approved, then REQ-001 (estimate 3–6 USD Claude + 1 OpenAI call + 10–20 min each).
3. `Code Changes Requested` → `--revise` loop.
4. `SELF_HEALING_DISABLED`: a spec with a broken CSS locator run through `yarn harness:run-tests` fails with the
   original error, logs `self-healing disabled for this run`, no OpenAI call, no source change, artifacts still
   written. The same spec run without the flag still enters the healing loop; a healing rerun child still skips via
   `HEALING_RERUN`.

## Relevant Files

- implementation-plans/agent-harness.md
- harness/agent/plan.ts
- harness/checks/plan-check.ts
- ai/review.ts
- ai/HealingEngine.ts
- .claude/rules/self-healing.md
- harness/agent/run-tests.ts (new)
- package.json
- .claude/settings.json
- CLAUDE.md
