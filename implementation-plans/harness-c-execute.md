# Implementation Plan: Harness Slice C — Execute (Stage 7)

Part of `implementation-plans/agent-harness.md` (stage 7: execute → on failure: locator self-healing, otherwise collect failure info).

## Objective

After the human accepts the code, one command runs the tests with self-healing **enabled**, collects a machine-readable
result per test (including the healing outcome), and for every test that still fails produces a root-cause report with
`/debug-failure` — without changing code:

```
yarn agent:execute implementation-plans/<plan>.md | --suite smoke|regression
  clean tree → harness:clean → Playwright run (healing on, Desktop Chromium)
  → harness-results/summary.json (per test: status, failed step, healing outcome, artifacts, log)
  → healing patches found? list them (uncommitted, .bak kept) for the human
  → each failed test (capped): claude -p /debug-failure → harness-results/failures/<run>/<test>.json (validated)
  → harness-results/execute/<run>.json + console summary; exit 1 if anything failed or was healed
```

Self-fix stays the existing locator self-healing only (Decisions 2026-11-07). Nothing in this slice applies a fix or commits.

## Decisions (2026-11-18)

| Topic | Decision |
|---|---|
| Healing during execute | Enabled (unlike `harness:run-tests`): this stage is where self-healing is meant to act. `HealingEngine` flow unchanged |
| Result source | A custom Playwright reporter (`harness/reporters/summary-reporter.ts`, no new dependency), not the JSON reporter: it sees annotations (`self-healed`), attachments (`AI Analysis — …` → `ai-response.json`) and steps, which is what the healing outcome and the failed step need |
| Healing outcome per test | Derived by the reporter, no change to the self-healing pipeline: `self-healed` annotation → `HEALED`; `AI Analysis` attachment with `patchType: MANUAL` → `MANUAL`; attachment with a patch but test failed → `FAILED`; console `self-healing disabled` / no attachment → `NONE` |
| Healing rerun child | The child spawned by `TestRerunner` (`HEALING_RERUN=true`) must not overwrite the parent's summary: the reporter writes nothing when `HEALING_RERUN=true` |
| Healing patches | Detected after the run by `git diff --name-only` + `*.bak` files; reported with the diff, left uncommitted with the `.bak` for the human (CLAUDE.md: healing patches are reviewed) |
| `/debug-failure` in the pipeline | Headless, read-only on the repo: may read, grep, `git diff`, and rerun one test only through `yarn harness:run-tests --grep` (healing off); writes only its JSON report. It never edits code (fixing is a new requirement → plan) |
| Clean inputs | `yarn harness:clean` removes stale `artifacts/`, `logs/`, `test-results/` and the reports `playwright-report/`, `allure-results/`, `allure-report/` before a run (`/debug-failure` §0: artifacts are never cleared, logs are appended; Q4) |
| Logs | Winston lines get an ISO timestamp and the level; no change to the log file naming |
| Scope | Local runs, `playwright.config.web.js`, Desktop Chromium. CI workflows unchanged |
| Cost guard | Healing calls OpenAI per failure (existing); `/debug-failure` calls Claude per failed test, capped per run (Q3) |

## Sub-slices

One detailed plan per sub-slice, approved before implementation (constraint in `agent-harness.md`).

- **C1 Run hygiene and logs (done, `harness-c1-clean-logs.md`):** `harness/agent/clean.ts` + `yarn harness:clean` (`artifacts/`, `logs/`, `test-results/`, `playwright-report/`, `allure-results/`, `allure-report/`; `--dry-run`);
  `utils/LoggerManager.ts` adds `winston.format.combine(timestamp(), json())`. `/debug-failure` §0 points to `harness:clean`.
- **C2 Summary reporter (done, `harness-c2-summary-reporter.md`):** `harness/reporters/summary-reporter.ts` registered in `playwright.config.web.js` next to `html` and
  `allure-playwright`. Writes `harness-results/summary.json` at `onEnd`: run (startedAt, finishedAt, env, git sha, dirty files at start,
  status), per test (title, file, line, project, status, durationMs, retry, error first lines, failed step title + location from
  `onStepEnd`, healing outcome + `ai-response.json` path, artifact folder `artifacts/{browser}/{title_}`, log `logs/{browser}.{name}.log`,
  trace/video/screenshot paths). Skips writing when `HEALING_RERUN=true`. Fixture-based unit check with a fake `TestCase`/`TestResult`.
- **C3 `/debug-failure` JSON report (done, `harness-c3-failure-report.md`):** the skill gains a headless mode with an output contract
  `harness-results/failures/<run>/<test-slug>.json`: `test`, `project`, `failedStep`, `category`
  (`locator | data | component | app | environment | config`), `evidence[]` (`file`, `excerpt`), `healing` (outcome, patch file/diff),
  `rootCause`, `proposedFix`, `confidence`. `harness/checks/failure-report-check.ts` validates it. Interactive use unchanged (report in chat).
- **C4 `yarn agent:execute` (done, `harness-c4-agent-execute.md`):** `harness/agent/execute.ts` on `runner.ts`. Stages: clean tree → `harness:clean` → `yarn playwright test
  <specs> --config=playwright.config.web.js --project="Desktop Chromium"` (healing on) → read `summary.json` → healing patches → for each
  failed test up to the cap: `claude -p "/debug-failure …"` (read-only tool list) + `failure-report-check` + "no tracked file changed by
  Claude" → `harness-results/execute/<run>.json` and a console table (test, status, healing, category, report). Exit 0 only when all passed
  without healing.

## Open Questions

- Q1: Input of `agent:execute`: an accepted plan (run the spec files of its last cited test result, like `agent:accept`) and/or a suite
  (`--suite smoke|regression` → `--grep @Smoke|@Regression`)? Plan: both.
  → A: Both (2026-11-19).
- Q2: Register the summary reporter in `playwright.config.web.js` (every local and CI run writes `harness-results/summary.json`, gitignored)
  or only add it on the `agent:execute` command line? Plan: config — human runs also get the summary; passing `--reporter` on the command
  line would replace `html` and `allure-playwright`.
  → A: Config (2026-11-19).
- Q3: Cap on `/debug-failure` Claude calls per execute run? Plan: 3 (the remaining failures are listed without a report).
  → A: 3 (2026-11-19).
- Q4: Should `harness:clean` also remove `playwright-report/` and `allure-results/`? Plan: no — they are reports, regenerated or
  accumulated on purpose; only the inputs `/debug-failure` reads.
  → A: Yes — also clear the Playwright and Allure reports (`playwright-report/`, `allure-results/`, `allure-report/`) (2026-11-19).
- Q5: A healed run: exit 1 so the human must look at the patch, or exit 0 with a warning? Plan: exit 1 ("healed — review the patch").
  → A: Exit 1 (2026-11-19).

## Verification (slice level; each sub-plan details its own)

1. `yarn harness:clean --dry-run` lists only the six folders; after a run they hold only that run's files.
2. A Day25 run writes `summary.json` with one entry per test; a healing rerun child does not overwrite it.
3. A deliberately broken CSS locator in a scratch branch (not committed): with OpenAI credits, the summary shows `HEALED` or `MANUAL` with the
   `ai-response.json` path; `agent:execute` lists the patch and the `.bak`.
4. A failing test with healing `MANUAL`/`NONE` gets a `/debug-failure` JSON report that passes `failure-report-check`; Claude changed no tracked file.
5. `agent:execute --suite smoke` on a green `main` exits 0 with no Claude call.

Requires OpenAI credits for step 3 (healing) — currently exhausted (REQ-004).

## Relevant Files

- implementation-plans/agent-harness.md
- harness/agent/runner.ts
- harness/agent/run-tests.ts
- harness/agent/accept.ts
- harness/agent/clean.ts (new)
- harness/agent/execute.ts (new)
- harness/reporters/summary-reporter.ts (new)
- harness/checks/failure-report-check.ts (new)
- .claude/skills/debug-failure/SKILL.md
- utils/LoggerManager.ts
- playwright.config.web.js
- config/framework.config.ts
- ai/HealingEngine.ts
- ai/TestRerunner.ts
- ai/collectors/ComponentFailureCollector.ts
- tests/fixtures/base.ts
- package.json
- CLAUDE.md
