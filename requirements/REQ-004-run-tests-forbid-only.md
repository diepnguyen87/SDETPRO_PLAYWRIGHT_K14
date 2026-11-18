# REQ-004: Agent Test Runs Fail on test.only

## Metadata
- ID: REQ-004
- Area: harness
- Source: manual
- Author: Claude

## Goal
`yarn harness:run-tests` is the only way agents run specs, and its result file is the test evidence for the gates, the OpenAI code review and `agent:accept`. When a spec in the run contains `test.only` / `describe.only`, Playwright runs only the focused tests and silently skips every other spec of the same run, and the result still reports success. This happened in REQ-003: `tests/web/Day24/TestFooterFlow.spec.ts` used `test.only`, so a run with five spec paths executed only Day24's 15 tests and reported "15 passed". A run that contains a focused test must fail with a clear message instead of producing misleading evidence.

## Scope
### In Scope
- `harness/agent/run-tests.ts` always runs Playwright with `--forbid-only`, like the other fixed options (config, project, `SELF_HEALING_DISABLED`).
- The result file `harness-results/tests/<timestamp>.json` and the console summary state why the run failed (the focused test and its file), so the agent and the runners see the cause without opening the Playwright output.
- `CLAUDE.md` (`harness:run-tests` description) and the `/implement-plan` / `/revise-code` skills mention that a focused test fails the run and must be removed, not worked around.

### Out of Scope
- Removing `test.only` from the exercise files `tests/web/Day19.spec.ts`, `Day20.spec.ts`, `Day21.spec.ts` (still baselined as R8).
- The arch-check rule R8 and its baseline, including the stale `R8|tests/web/Day24/TestFooterFlow.spec.ts|test.only` entry left after `59dd5d8`.
- Plain `yarn playwright test` / `yarn test:*` runs by humans and the CI workflows.

## Preconditions
- `yarn harness:run-tests` works as today (B2) on specs without `.only`.
- `tests/web/Day19.spec.ts` contains `test.only` (usable as the failing case without editing any file).

## Actors
- Agent (Claude in `/implement-plan`, `/revise-code`, or an interactive session) running specs.
- `yarn harness:run-tests`, and the runners that read its result files (`agent:implement`, `agent:accept`).

## User Flow
1. The agent runs `yarn harness:run-tests <spec...>`.
2. If no spec in the run contains a focused test, the tests run and the result file is written as today.
3. If a spec in the run contains `test.only` or `describe.only`, Playwright stops before running any test.
4. `harness:run-tests` exits non-zero, writes a result file that records the error, and prints the focused test and file.
5. The agent removes the `.only` (if the file is in its scope) or reports it, and runs again.

## Acceptance Criteria
- [ ] AC1: Every `yarn harness:run-tests` call runs Playwright with `--forbid-only`; the `command` field of the result file shows it.
- [ ] AC2: A run whose specs contain no focused test behaves as before: same tests executed, same per-test results and exit code.
- [ ] AC3: A run including `tests/web/Day19.spec.ts` exits non-zero without executing any test, and its result file has `exitCode` ≠ 0, `passed` 0, and a `globalErrors` entry naming the focused test and `Day19.spec.ts`.
- [ ] AC4: The console summary of a failed run like AC3 prints the forbid-only error on one line (not only "0 passed, 0 failed").
- [ ] AC5: `lastCitedTestResult` / `assertTestsPassed` (used by `agent:implement` and `agent:accept`) treat the AC3 result file as failed.
- [ ] AC6: `CLAUDE.md` and the `/implement-plan` and `/revise-code` skills state that `harness:run-tests` forbids focused tests.

## Expected Results
- No agent test run can report success while other specs of the run were silently skipped by a focused test.
- The cause of a forbid-only failure is visible in the console and in the result file.
- Runs without focused tests are unchanged.

## Error Cases
- E1: When only some of the specs in a run contain a focused test, the whole run fails (no partial execution of the others), naming the focused test.
- E2: When `--forbid-only` is passed by the caller as an extra option, `harness:run-tests` rejects it like other options today (the flag is fixed, not configurable).

## Test Data
- None (uses existing specs: `tests/web/Day19.spec.ts` for the focused case, a Day25 spec for the unchanged case).

## Notes
- Playwright checks `--forbid-only` only on the spec files included in the run, so the remaining `.only` in Day19–Day21 do not affect runs of other specs.
- Confirmed on the installed Playwright: `--forbid-only` with Day19 fails with `Error: item focused with '.only' is not allowed due to the '--forbid-only' CLI flag: "Day19.spec.ts Link Text - Filtering"`; with a Day25 spec alone the run is unaffected.
- `run-tests.ts` is in `harness/`, which `/implement-plan` may not edit; like REQ-003, it is implemented in an interactive session.
