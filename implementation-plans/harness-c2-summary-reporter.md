# Implementation Plan: Harness C2 — Summary Reporter

Part of `implementation-plans/harness-c-execute.md` (Slice C, sub-slice C2).

## Objective

Every web test run writes `harness-results/summary.json`: one machine-readable entry per test with its final status, the step that
failed, the self-healing outcome, and the paths to the evidence (artifacts, log, trace, video, screenshot), plus the source files the
run changed (healing patches). `/debug-failure` (C3) and `agent:execute` (C4) read it instead of scraping console output.

## Decisions (2026-11-19)

| Topic | Decision |
|---|---|
| Form | Custom reporter `harness/reporters/summary-reporter.ts` (Playwright `Reporter` API, no new dependency), registered in `playwright.config.web.js` after `html` and `allure-playwright` (Slice C Q2) |
| Output | `harness-results/summary.json`, overwritten by each run (gitignored). C4 archives its own copy per execute run |
| Runs that do not write | Healing rerun child (`HEALING_RERUN=true`, spawned by `TestRerunner` with the config reporters) — it would overwrite the parent's summary. A run in which no test began and no error was reported (`--list`, used by every gate). `harness:run-tests` passes `--reporter=list,json` on the command line, which replaces the config reporters, so agent runs never write it |
| Healing outcome | Derived without touching the self-healing pipeline, in this order: `self-healed` annotation (`tests/fixtures/base.ts`) → `HEALED`; an `AI Analysis — …` attachment (`HealingEngine`) whose `ai-response.json` has `patchType: MANUAL` → `MANUAL`; such an attachment and the test not passed → `FAILED`; worker stdout lines from `HealingEngine` (`self-healing disabled` → `DISABLED`, `locked by another worker` → `SKIPPED`, `AI analysis failed` → `FAILED`); otherwise `NONE`. The matched evidence is kept as `healing.reason` |
| Spec file | From the file suite (`test.parent` chain up to the suite of type `file`), not `test.location`: tests registered through `tests/fixtures/base.ts` report `base.ts:113` as their location |
| Failed step | Deepest step with an `error` in `result.steps` (depth-first), as `{ title, category, location }` |
| Evidence paths | Artifact folder `artifacts/{project}/{title with \W+ → _}` (same rule as `ComponentFailureCollector` / `AssertionFailureCollector`, which are pipeline files and not changed), included only if it exists; log path from a new `LoggerManager.logFilePath(project, title)` that `createLogger()` also uses, so the rule lives in one place; `trace` / `video` / `screenshot` from `result.attachments` |
| Source changes | `git status --porcelain` content hashes at `onBegin` and `onEnd`; files whose hash changed during the run are `sourceChanges`, plus any `*.bak` created during the run — the healing patches a human must review |
| Failure safety | The reporter never fails the run: any error while building or writing the summary is printed as a warning |
| Checks | `harness/reporters/summary-reporter.check.ts` drives the reporter with fake `TestCase` / `TestResult` objects (no browser) and asserts the JSON; `yarn harness:test` runs it after the arch fixtures |

## summary.json

```json
{
  "run": {
    "startedAt": "…", "finishedAt": "…", "status": "passed|failed|timedout|interrupted",
    "env": "sit", "baseURL": "…", "gitSha": "…", "dirtyAtStart": ["…"],
    "command": "playwright test …", "errors": ["…"],
    "totals": { "passed": 0, "failed": 0, "flaky": 0, "skipped": 0, "healed": 0 }
  },
  "tests": [{
    "title": "@Smoke | Test Credit Card Checkout", "file": "tests/web/Day25/TestStandardComponent.spec.ts",
    "project": "Desktop Chromium", "status": "passed|failed|timedOut|skipped|interrupted", "outcome": "expected|unexpected|flaky|skipped",
    "durationMs": 0, "retry": 0, "error": "first lines, ANSI stripped",
    "failedStep": { "title": "locator.waitFor", "category": "pw:api", "location": "models/…:21" },
    "healing": { "outcome": "HEALED|MANUAL|FAILED|DISABLED|SKIPPED|NONE", "reason": "…", "aiResponse": "artifacts/…/ai-response.json" },
    "artifacts": "artifacts/Desktop Chromium/_Smoke_Test_Credit_Card_Checkout", "log": "logs/Desktop Chromium.Test_Credit_Card_Checkout.log",
    "trace": "…", "video": "…", "screenshot": "…"
  }],
  "sourceChanges": ["models/components/…Component.ts", "models/components/…Component.ts.bak"]
}
```

Absent values are omitted, not `null`. Paths are project-relative.

---

## 1. `harness/reporters/summary-reporter.ts` (new)

`onBegin` (store config, git sha, dirty hashes, start time), `onTestBegin` (mark that tests ran), `onTestEnd` (keep the last result per
test), `onError` (collect), `onEnd` (build and write; return the write promise). Pure helpers exported for the check: `healingOutcome()`,
`failedStep()`, `specFile()`, `buildSummary()`.

## 2. `utils/LoggerManager.ts`

`public static logFilePath(project: string, title: string): string` — the existing rule (`title.split("|").pop().trim()`, spaces → `_`,
`logs/{project}.{name}.log`); `getLogger()` / `createLogger()` use it. File names unchanged.

## 3. `playwright.config.web.js`

`reporter: [['html'], ['allure-playwright'], ['./harness/reporters/summary-reporter.ts']]`.

## 4. Checks, docs

- `harness/reporters/summary-reporter.check.ts` (new): fake cases for `HEALED` (annotation), `MANUAL` (attachment + JSON), `FAILED`
  (attachment, LOCATOR, failed), `DISABLED` (stdout), `NONE`; failed-step selection; spec file through a fake `base.ts` location;
  `HEALING_RERUN=true` and the `--list` case write nothing.
- `package.json`: `harness:test` → `tsx harness/checks/run-fixtures.ts && tsx harness/reporters/summary-reporter.check.ts`.
- `CLAUDE.md`: Test Execution / Debugging — `harness-results/summary.json` and what it holds; `/debug-failure` §0 reads it first when present.
- `implementation-plans/harness-c-execute.md`: C2 marked done.

---

## Open Questions

- Q1: Keep only the latest `summary.json`, or also a timestamped copy per run (`harness-results/runs/<timestamp>.json`)? Plan: only the
  latest; C4 archives the runs it starts. Human runs keep just the last summary.
  → A: Only the latest `summary.json` (2026-11-19).
- Q2: Record `sourceChanges` in the reporter (every run, human runs included), or leave patch detection to C4 only? Plan: in the reporter —
  a healed human run then also lists the patch.
  → A: In the reporter (2026-11-19).

## Verification

1. `yarn tsc --noEmit`; `yarn harness:check-arch`; `yarn harness:test` (arch fixtures + reporter check) pass.
2. `yarn harness:clean`, then `yarn playwright test tests/web/Day25/TestStandardComponent.spec.ts --config=playwright.config.web.js`
   → `summary.json` with 3 entries, `file` = the spec path, status `passed`, healing `NONE`, `log` path exists, no `sourceChanges`;
   `playwright-report/` and `allure-results/` still produced.
3. `yarn playwright test --list --config=playwright.config.web.js` → `summary.json` unchanged (mtime).
4. `yarn harness:run-tests tests/web/Day25/TestCheapComponent.spec.ts` → `summary.json` unchanged.
5. `HEALING_RERUN=true yarn playwright test tests/web/Day25/TestCheapComponent.spec.ts --config=playwright.config.web.js` → unchanged.
6. A failing run without credits: a test with a temporarily broken CSS selector in a scratch copy is not possible without editing a
   tracked file, so the failure path is covered by the reporter check (step 1); a real `HEALED` / `MANUAL` run is verified in C4 when OpenAI
   credits are available.
7. `yarn harness:check-scope implementation-plans/harness-c2-summary-reporter.md`.

## Relevant Files

- harness/reporters/summary-reporter.ts (new)
- harness/reporters/summary-reporter.check.ts (new)
- utils/LoggerManager.ts
- playwright.config.web.js
- package.json
- CLAUDE.md
- .claude/skills/debug-failure/SKILL.md
- implementation-plans/harness-c-execute.md
- harness/agent/run-tests.ts
- harness/agent/runner.ts
- ai/HealingEngine.ts
- ai/TestCommandBuilder.ts
- ai/TestRerunner.ts
- ai/collectors/ComponentFailureCollector.ts
- ai/collectors/AssertionFailureCollector.ts
- tests/fixtures/base.ts
- config/environment.config.ts
