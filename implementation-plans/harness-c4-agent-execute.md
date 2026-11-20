# Implementation Plan: Harness C4 — `yarn agent:execute`

Part of `implementation-plans/harness-c-execute.md` (Slice C, sub-slice C4 — the last one).

## Objective

One command runs stage 7 end to end on top of C1–C3 and never changes code itself:

```
yarn agent:execute implementation-plans/<plan>.md      (Status: Accepted → spec files of its last cited test result)
yarn agent:execute --suite smoke|regression            (--grep @Smoke | @Regression; 6 / 22 tests today)
yarn agent:execute --spec <file...>                    (Q1)

  no modified tracked file → harness:clean
  → yarn playwright test <specs | --grep> --config=playwright.config.web.js --project="Desktop Chromium" --forbid-only   (self-healing ON)
  → read harness-results/summary.json (fresh) → archive it
  → healing patches (summary.sourceChanges): diff each, keep them uncommitted with the .bak
  → each failed, not healed test (at most 3): claude -p "/debug-failure --report <path> --project <p> <title>"
       + no file changed by Claude + yarn harness:check-failure-report
  → harness-results/execute/<run>.json + console table
  → exit 0 only if every test passed without healing (Slice C Q5)
```

## Decisions (2026-11-20)

| Topic | Decision |
|---|---|
| Inputs | Exactly one of: an `Accepted` plan (spec files of its last cited `harness-results/tests/*.json`, as `agent:accept` does), `--suite smoke\|regression` (`--grep` with `TAG.smoke` / `TAG.regression`), `--spec <file...>` under `tests/web/` (Q1). Anything else → usage, exit 2 |
| Clean start | No modified, staged or deleted **tracked** file (`git status --porcelain --untracked-files=no` empty), so every source change after the run is attributable to healing. Untracked files are allowed (Q2) |
| Test run | Plain Playwright with the config reporters (summary reporter writes `summary.json`) and self-healing enabled; `--forbid-only` added like `harness:run-tests` (REQ-004). Playwright's exit code is recorded, not treated as a stage failure — failing tests are the expected input of the next stages |
| Freshness | `summary.json` must exist with `run.startedAt` ≥ the stage start; otherwise stop (`no summary written` — e.g. a global error before any test) and print Playwright's output tail |
| Archive | `summary.json` copied to `harness-results/execute/<run>.summary.json` (C2 Q1: C4 archives its runs); `<run>` = start timestamp, filename-safe |
| Healing patches | `summary.sourceChanges` → for each changed file `git diff -- <file>` (untracked: `git diff --no-index /dev/null <file>`) stored in the execute report; `.bak` files listed. Nothing restored, committed or deleted — the human reviews the patch (CLAUDE.md) |
| Debug selection | Tests with `outcome: unexpected` whose healing is not `HEALED`, in summary order, at most 3 (Slice C Q3); the rest listed as `notDebugged`. Flaky tests are reported, not debugged |
| Debug stage | Report path `harness-results/failures/<run>/<project>.<title with \W+ → _>.json`; tools = `skillTools("debug-failure")`; `--max-turns 40`. After each call: no file outside `harness-results/` changed (content hashes, so already-dirty healing patches are covered), then `harness:check-failure-report`. A failed debug stage is recorded for that test and the next test continues; the run still exits 1 |
| Result file | `harness-results/execute/<run>.json`: input, command, Playwright exit code, totals, per test `{ title, file, status, outcome, healing, report?, category?, rootCause?, debugError? }`, `healingPatches[{ file, diff }]`, `bakFiles`, `notDebugged`, Claude turns/cost per debug call. Runner stage log in `harness-results/agent-execute/` as for the other runners |
| Code | `harness/agent/execute.ts` on `harness/agent/runner.ts` (`Runner`, `skillTools`, `dirtyFileHashes`, `changedOutsidePrefixes`, `lastCitedTestResult`); the spec-list logic of `agent:accept` moves to `runner.ts` (`citedSpecFiles(plan)`) and `accept.ts` uses it |
| Healing rerun window | `TestCommandBuilder` reruns `--headed`, so a healing attempt opens a browser window during `agent:execute`. Accepted (local runs only; the pipeline is unchanged) |

---

## 1. `harness/agent/execute.ts` (new) — `yarn agent:execute`

Stages (each logged by `Runner.stage`): parse input → (plan) `check-plan` + status `Accepted` → clean tracked tree → `harness:clean` →
Playwright run → fresh summary + archive → healing patches → debug per selected test (sub-stages per test, errors captured) → write the
result file → console table (`status | healing | category | report`) → exit code.

## 2. `harness/agent/runner.ts`, `harness/agent/accept.ts`

`citedSpecFiles(plan): string[]` (from `lastCitedTestResult`, mapped to `tests/web/<file>`) moved out of `accept.ts`; `accept.ts` calls it.
No behaviour change for `agent:accept`.

## 3. Documentation and config

- `package.json`: `"agent:execute": "tsx harness/agent/execute.ts"`.
- `CLAUDE.md`: Requirements and Plans — **Execute runner** line (inputs, healing on, patches left for review, `/debug-failure` reports capped at 3,
  result file, exit code); Gates and Guardrails unchanged.
- `implementation-plans/harness-c-execute.md`: C4 done, Slice C done; `implementation-plans/agent-harness.md`: Slice C done.

---

## Open Questions

- Q1: Add `--spec <file...>` as a third input (targeted runs, and the failure-path verification below) next to the plan and `--suite` inputs
  decided in Slice C Q1? Plan: yes.
  → A: Yes (2026-11-20).
- Q2: "Clean start" = no modified tracked files, untracked allowed (needed for the temporary failing spec in Verification; healing patches tracked
  sources and the summary also hashes untracked files)? Plan: yes.
  → A: Yes (2026-11-20).
- Q3: The `HEALED` end-to-end path needs OpenAI credits (healing analysis). Verify it now if credits are added, otherwise record it as pending and
  verify on the first real healing? Plan: pending until credits are available; the `FAILED` / `MANUAL`-style path is verified now.
  → A: Pending until OpenAI credits are available (2026-11-20).

## Verification

1. `yarn tsc --noEmit`; `yarn harness:check-arch`; `yarn harness:test` pass.
2. No-cost negatives: no input / two inputs / `--suite foo` / `--spec` outside `tests/web/` → exit 2; plan not `Accepted` → stops at status; a
   modified tracked file → stops at the clean-start stage; each leaves a run log.
3. `agent:accept` unchanged after the `citedSpecFiles()` move: `yarn agent:accept` on a scratch copy of an `Accepted` plan off `main` still stops at
   the branch stage (no commit).
4. Green run: `yarn agent:execute implementation-plans/REQ-004-run-tests-forbid-only.md` (4 Day25 tests) → exit 0, no Claude call, no healing
   patch, `execute/<run>.json` and `<run>.summary.json` written.
5. Failure path (≈ $0.3 Claude): temporary untracked `tests/web/_tmp/TmpFailure.spec.ts` (the C3 spec) → `yarn agent:execute --spec
   tests/web/_tmp/TmpFailure.spec.ts` → healing `FAILED` (no credits) or `MANUAL`, one `/debug-failure` report that passes the checker, no
   tracked change, exit 1 → spec deleted, `yarn harness:clean`.
6. Cap: `--spec` with 4 failing temporary tests is not run (cost); covered by reading the selection code and a dry selection over a hand-made
   summary in a tsx one-off (4 unexpected → 3 debugged, 1 `notDebugged`).
7. `yarn agent:execute --suite smoke` → 6 tests (Login / Register need the SIT credentials from `.env.sit`); records the result; exit 0 if green.
8. `yarn harness:check-scope implementation-plans/harness-c4-agent-execute.md`.

## Implementation Notes

Deviations:
- D1: A run that completes all stages but is not clean finishes the runner log with `ok: true` and prints `DONE` plus
  `RESULT: not clean … (exit 1)`; the first version printed `STOPPED`, which read like a runner failure (`7e8eb2f`). Exit code unchanged.

Checks (2026-11-20):
- `yarn tsc --noEmit`, `yarn harness:check-arch`, `yarn harness:test`, `check-scope` — passed.
- Negatives: no input, plan + `--suite`, `--suite foo`, `--spec harness/agent/execute.ts`, `--spec` without file → exit 2 with the usage /
  reason; REQ-002 (`Implemented`) → stops at "status is Accepted"; uncommitted tracked change → stops at "no modified tracked file".
- `agent:accept` after the `citedSpecFiles()` move: scratch copy of REQ-004 on a temporary branch → `check-plan` ✓, `Accepted` ✓, stops at the
  branch stage; `citedSpecFiles(REQ-004)` → `TestCheapComponent` + `TestStandardComponent`.
- Selection: 7 fake tests (unexpected ×4 not healed, 1 healed, expected, flaky) → debug `a, d, e`, notDebugged `f`.
- Green plan run: `yarn agent:execute implementation-plans/REQ-004-run-tests-forbid-only.md` → 4 passed, healing `NONE`, no patch, no Claude call,
  exit 0; `harness-results/execute/2026-11-20T02-29-50-556Z.json` + `.summary.json`.
- Failure path: temporary untracked `tests/web/_tmp/TmpFailure.spec.ts` → `yarn agent:execute --spec …` → failed, healing `FAILED` (no OpenAI
  credits), one `/debug-failure` report (15 turns, $0.48) that passed the checker — `component`, confidence 95 — no tracked change, exit 1.
  Spec deleted.
- Suite: `yarn agent:execute --suite smoke` → 6 passed (incl. login / register with the SIT credentials), healing `NONE`, exit 0.
- Q3 (2026-11-20, credits added): temporary untracked `models/components/_tmp/TmpBrokenSearchComponent.ts` (selector
  `input#small-search-terms-v2`) + spec → `yarn agent:execute --spec tests/web/_tmp/TmpHealing.spec.ts` → OpenAI patched the selector to
  `input#small-searchterms` and the healing rerun passed: summary healing `HEALED`, `sourceChanges` = the component + its `.bak`, both diffed in
  `healingPatches`, no `/debug-failure` call, exit 1. The harness reported everything correctly. **Finding (self-healing pipeline, not changed
  here):** the healed parent test still ended `failed` at teardown — `browserContext.close: ENOENT … test-results/.playwright-artifacts-0/traces/….trace`.
  The healing rerun (`ai/TestCommandBuilder.ts` → `yarn playwright test … --config=playwright.config.web.js`) uses the same output dir
  `test-results/`, which Playwright empties at the start of every run, so the child deletes the parent's in-progress trace (`trace:
  'retain-on-failure'` always records). Every healed test is affected. Needs its own requirement (pipeline file). Temporary files deleted.

## Relevant Files

- harness/agent/execute.ts (new)
- harness/agent/runner.ts
- harness/agent/accept.ts
- harness/agent/run-tests.ts
- harness/agent/clean.ts
- harness/reporters/summary-reporter.ts
- harness/checks/failure-report-check.ts
- .claude/skills/debug-failure/SKILL.md
- constant/Tag.ts
- ai/TestCommandBuilder.ts
- package.json
- CLAUDE.md
- implementation-plans/harness-c-execute.md
- implementation-plans/agent-harness.md
