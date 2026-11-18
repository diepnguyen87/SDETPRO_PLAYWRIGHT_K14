# Implementation Plan: Agent Test Runs Fail on test.only

Status: Accepted
Requirement: requirements/REQ-004-run-tests-forbid-only.md

## Objective

`yarn harness:run-tests` always passes `--forbid-only` to Playwright, so a run that includes a spec with `test.only` / `describe.only` fails before any test runs instead of silently skipping the other specs and reporting success. The result file keeps the Playwright error in `globalErrors` and the console summary prints it on one line. `CLAUDE.md` and the `/implement-plan` / `/revise-code` skills say that a focused test fails the run and must be removed, not worked around.

## Acceptance Criteria Traceability

This is a harness requirement: it is covered by `yarn harness:run-tests` calls on existing specs and by reading the result files, not by a new spec.

| ID | Covered by (spec › flow step) | Assertion |
|---|---|---|
| AC1 | `yarn harness:run-tests tests/web/Day25/TestStandardComponent.spec.ts` and the AC3 run | `command` field of both result files contains `--forbid-only` |
| AC2 | `yarn harness:run-tests tests/web/Day25/TestStandardComponent.spec.ts tests/web/Day25/TestCheapComponent.spec.ts`, before and after the change | Same tests (file + title), same per-test status and same `exitCode` in both result files; only `command` differs (`--forbid-only`) |
| AC3 | `yarn harness:run-tests tests/web/Day19.spec.ts` | Exit code ≠ 0; result file `exitCode` ≠ 0, `passed` 0, `failed` 0, no `tests` entry with a status other than `skipped` (empty expected), one `globalErrors` entry containing `--forbid-only`, `Day19.spec.ts` and `Link Text - Filtering` |
| AC4 | Console output of the AC3 run | The run summary contains one line `  ✗ <first line of the global error>` containing `'.only' is not allowed` (position relative to the counts line not asserted) |
| AC5 | `yarn tsx -e` one-off check (Verification step 6) calling `assertTestsPassed(<AC3 file>, <its JSON>)` from `harness/agent/runner.ts` | Throws `StageFailure` with `exit <n>, 0 passed, 0 failed`; no code change needed (`exitCode !== 0 \|\| passed === 0` already fails) |
| AC6 | Review of `CLAUDE.md`, `.claude/skills/implement-plan/SKILL.md`, `.claude/skills/revise-code/SKILL.md` | Each names `--forbid-only` / focused tests on the `harness:run-tests` line |
| E1 | `yarn harness:run-tests tests/web/Day19.spec.ts tests/web/Day25/TestStandardComponent.spec.ts` | Exit code ≠ 0, `passed` 0, `failed` 0, no `tests` entry with a status other than `skipped` (no Day25 test executed; empty expected), `globalErrors` names `Day19.spec.ts` and `Link Text - Filtering` |
| E2 | `yarn harness:run-tests tests/web/Day25/TestStandardComponent.spec.ts --forbid-only` | Exit code 2 before Playwright starts, message `Unsupported option --forbid-only: config, project, forbid-only and self-healing are fixed for agent runs`; no result file written |

## Scenarios

1. Unchanged run (AC1, AC2): `tests/web/Day25/TestStandardComponent.spec.ts` + `tests/web/Day25/TestCheapComponent.spec.ts` (no `.only`; each test starts from a fresh guest context, empty cart). Before the change → baseline result file; after → same tests and statuses, `command` now contains `--forbid-only`.
2. Focused spec alone (AC3, AC4, AC5): `tests/web/Day19.spec.ts` (`test.only('Link Text - Filtering')` at line 17, not edited). Playwright stops before running tests; result file and console show the error; `assertTestsPassed` rejects the file.
3. Mixed run (E1): Day19 + a Day25 spec → whole run fails, no Day25 test executed.
4. Caller passes the flag (E2): `--forbid-only` as an extra argument → rejected by `parseArgs()` like any other `--` option except `--grep`.

## Reuse

- `parseArgs()` in `harness/agent/run-tests.ts` — already rejects every `--` option except `--grep` (E2 holds without new logic; only the message changes).
- `summary.globalErrors` — already filled from the Playwright JSON report's `errors` with ANSI codes stripped (AC3 relies on it).
- `assertTestsPassed()` / `lastCitedTestResult()` in `harness/agent/runner.ts` — unchanged; `exitCode !== 0 || passed === 0` already rejects the AC3 file (AC5).
- `harness/agent/implement.ts` (test-run cap, final gate) and `harness/agent/accept.ts` (re-run of the cited specs through `harness:run-tests`) — unchanged; they inherit the flag.
- Specs `tests/web/Day19.spec.ts` (focused case) and `tests/web/Day25/TestStandardComponent.spec.ts`, `TestCheapComponent.spec.ts` (unchanged case) — not edited.

## Changes by Layer

### Spec
- None.

### TestFlow
- None.

### Page Object
- None.

### Component
- None.

### Test Data
- None.

### Config
- None.

### Harness
- `harness/agent/run-tests.ts`
  - Header comment: add "forbids focused tests (`--forbid-only`)" to the list of fixed behaviours.
  - `args`: `[..., "--config=playwright.config.web.js", \`--project=${PROJECT}\`, "--forbid-only", "--reporter=list,json"]` — so `command` shows it (AC1).
  - `parseArgs()` error message: `Unsupported option ${arg}: config, project, forbid-only and self-healing are fixed for agent runs` (E2).
  - `globalErrors`: if Playwright exited non-zero and wrote no JSON report (or a report with no `errors` and no tests), push `Playwright exited <code> without a test report` so the result file never shows a silent failure. If Verification step 1 shows the forbid-only error is already in `report.errors`, this fallback is the only addition.
  - Console summary: print each global error's first non-empty line as `  ✗ <line>` (AC4). Planned placement: after the counts line, before the per-test `✗` lines; the order is a presentation choice, AC4 only requires the one-line error in the summary.

### Docs
- `CLAUDE.md`, Gates and Guardrails, `yarn harness:run-tests` line: "… sets `SELF_HEALING_DISABLED=true`, `--forbid-only`, the web config and `Desktop Chromium` …; a spec with `test.only` / `describe.only` fails the whole run — remove the `.only` (or report it when the file is out of scope), never split the run to work around it."
- `.claude/skills/implement-plan/SKILL.md`, step 5: one sentence with the same rule (a focused-test failure is reported in `globalErrors`; remove the `.only` if the spec is in Relevant Files, otherwise record `Blocked:`).
- `.claude/skills/revise-code/SKILL.md`, step 6.2: the same sentence.

## Out of Scope

- Removing `test.only` from `tests/web/Day19.spec.ts`, `Day20.spec.ts`, `Day21.spec.ts`.
- arch-check R8, `harness/checks/arch-baseline.json` and its stale Day24 R8 entry.
- `yarn playwright test` / `yarn test:*` runs by humans, `playwright.config.web.js` (`forbidOnly` stays as configured), CI workflows.
- `harness/agent/runner.ts`, `implement.ts`, `accept.ts` — no change.

## Risks

- If Playwright writes no JSON report on a forbid-only failure, `globalErrors` would only hold the fallback text and AC3's "names the focused test" would not hold from the report alone. Verification step 1 checks this before the edit; if the report lacks the error, see Q2.
- The first line of the Playwright error may hold only `Error: item focused with '.only' is not allowed …: "Day19.spec.ts Link Text - Filtering"` and the file location on a later line; that line already names the file and title, which is what AC4 asks.
- A run counted by `agent:implement`'s test-run cap that fails on forbid-only uses up one of the agent's rounds; accepted — the agent must remove the `.only` anyway.

## Open Questions

- Q1: Who implements the plan? `/implement-plan` (and so `yarn agent:implement`) may not edit `harness/`, `.claude/` or `CLAUDE.md`. Plan: like REQ-003, Claude implements it in an interactive session, then `yarn ai:review --mode code`.
  → A: Claude implements it in an interactive session, like REQ-003 (2026-11-18).
- Q2: If Verification step 1 shows Playwright writes no JSON report (or no `errors`) on a forbid-only failure, should `run-tests.ts` capture Playwright's stderr (switch `stdio` from `inherit` to a tee) to fill `globalErrors`? Plan: only the fallback message; capture stderr only if the human confirms.
  → A: No stderr capture. Checked 2026-11-18: with `--forbid-only` on Day19 the JSON report has one `errors` entry `Error: item focused with '.only' is not allowed due to the '--forbid-only' CLI flag: "Day19.spec.ts Link Text - Filtering"` (exit 1, no suites); keep only the fallback message.

## Human Review Notes

## Verification

1. Before any edit (clean `main`): `yarn harness:run-tests tests/web/Day25/TestStandardComponent.spec.ts tests/web/Day25/TestCheapComponent.spec.ts` (AC2 baseline). Then run Playwright once with the flag on the focused spec to see what the JSON report holds: `PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/req004.json yarn playwright test tests/web/Day19.spec.ts --config=playwright.config.web.js --project="Desktop Chromium" --reporter=list,json --forbid-only` and inspect `errors` in `/tmp/req004.json`; record the result in Implementation Notes (Q2).
2. `yarn tsc --noEmit` — zero errors.
3. `yarn harness:check-arch` (changed files) and `yarn harness:test` — pass.
4. `yarn harness:run-tests tests/web/Day25/TestStandardComponent.spec.ts tests/web/Day25/TestCheapComponent.spec.ts` — compare with step 1 test by test (file, title, status, `exitCode`); `command` contains `--forbid-only` (AC1, AC2).
5. `yarn harness:run-tests tests/web/Day19.spec.ts` (AC3, AC4) and `yarn harness:run-tests tests/web/Day19.spec.ts tests/web/Day25/TestStandardComponent.spec.ts` (E1) — non-zero exit; check the console `✗` error line and the result-file fields (`exitCode`, `passed`/`failed` 0, no non-`skipped` test, `globalErrors`).
6. AC5: `yarn tsx -e 'import fs from "node:fs"; import { assertTestsPassed } from "./harness/agent/runner.ts"; const f = process.argv[1]; try { assertTestsPassed(f, JSON.parse(fs.readFileSync(f, "utf8"))); console.log("NOT REJECTED"); process.exit(1) } catch (e) { console.log("rejected:", (e as Error).message) }' harness-results/tests/<AC3 timestamp>.json` — prints `rejected: …`.
7. E2: `yarn harness:run-tests tests/web/Day25/TestStandardComponent.spec.ts --forbid-only` — exit 2 with the new message, no new result file.
8. `yarn playwright test --list --config=playwright.config.web.js` — specs and data load.
9. `yarn harness:check-scope implementation-plans/REQ-004-run-tests-forbid-only.md`.

The last result file cited in Implementation Notes must be the passing step 4 run (the runners require a passed citation).

## Review Resolution

Review: `implementation-review/REQ-004-run-tests-forbid-only.plan.md` — verdict `APPROVE_WITH_CHANGES`.

- F1 Accepted: REQ-004 AC4 only asks for the error "on one line" in the console summary, not its position. The AC4 Traceability row now asserts only that the summary contains a `  ✗ …'.only' is not allowed…` line; the Harness bullet keeps "after the counts line" as the planned placement but marks the order as a presentation choice.
- F2 Accepted (adapted): `tests` empty stays the expected outcome, but AC3 and E1 now assert the requirement's actual condition ("without executing any test") through `passed` 0, `failed` 0 and no `tests` entry with a status other than `skipped`, plus the non-zero exit and the `globalErrors` text. `collect()` in `harness/agent/run-tests.ts:52-68` would list discovered-but-unrun tests as `skipped` (`last?.status ?? "skipped"`), so this check is robust to that report shape while still catching any executed test.

## Implementation Notes

Implemented by Claude in an interactive session (Q1), not through `/implement-plan`.

Deviations:
- None

Pre-edit check (Verification step 1): with `--forbid-only` on `tests/web/Day19.spec.ts` Playwright exits 1 and its JSON report has no suites and one `errors` entry `Error: item focused with '.only' is not allowed due to the '--forbid-only' CLI flag: "Day19.spec.ts Link Text - Filtering"`, so `globalErrors` is filled from the report (Q2: no stderr capture; the fallback message only covers a run with no report).

Gates: last run, after the final change.
- `yarn tsc --noEmit` — passed, 0 errors.
- `yarn harness:check-arch` — passed (no scanned file changed); `yarn harness:test` — passed.
- `yarn playwright test --list --config=playwright.config.web.js` — passed, 70 tests in 14 files.
- `yarn harness:check-scope implementation-plans/REQ-004-run-tests-forbid-only.md` — passed, 4 changed files.

Checks:
- AC3 / AC4: `yarn harness:run-tests tests/web/Day19.spec.ts` — exit 1, console `✗ Error: item focused with '.only' is not allowed due to the '--forbid-only' CLI flag: "Day19.spec.ts Link Text - Filtering"`; `harness-results/tests/2026-11-18T09-08-55-064Z.json`: `exitCode` 1, `passed` 0, `failed` 0, no non-skipped test, `command` with `--forbid-only`, the error in `globalErrors`.
- E1: Day19 + `tests/web/Day25/TestStandardComponent.spec.ts` — same error, no Day25 test executed (`harness-results/tests/2026-11-18T09-08-56-394Z.json`).
- E2: `... TestStandardComponent.spec.ts --forbid-only` — exit 2, `Unsupported option --forbid-only: config, project, forbid-only and self-healing are fixed for agent runs`, no result file written.
- AC5: `assertTestsPassed()` on the AC3 file — `rejected: ...: exit 1, 0 passed, 0 failed`.
- AC6: `CLAUDE.md` (`harness:run-tests` line), `/implement-plan` step 5 and `/revise-code` step 6.2 state the rule.

Tests: `yarn harness:run-tests tests/web/Day25/TestStandardComponent.spec.ts tests/web/Day25/TestCheapComponent.spec.ts` (AC1, AC2), Desktop Chromium, self-healing disabled. Before `harness-results/tests/2026-11-18T09-06-41-432Z.json`: 4 passed, exit 0, no `--forbid-only`. After `harness-results/tests/2026-11-18T09-09-11-154Z.json`: 4 passed, exit 0, same tests and statuses, `command` with `--forbid-only`.

## Human Code Review Notes

## Code Review Resolution

OpenAI code review not run: `yarn ai:review --mode code` failed with `429 You have no credits remaining` (2026-11-18). The human decided to skip it for this change (one harness file, all ACs and error cases checked above); no `implementation-review/REQ-004-run-tests-forbid-only.code.json`.

## Commit Message

```text
Implement REQ-004: agent test runs fail on test.only

- harness:run-tests always passes --forbid-only, so a spec with
  test.only / describe.only fails the run instead of silently
  skipping the other specs and reporting success.
- The Playwright error is kept in globalErrors and printed as one
  "✗" line; a failed run without a report gets a fallback reason.
- CLAUDE.md, /implement-plan and /revise-code: remove the .only (or
  report it), never split the run around it.

OpenAI code review skipped (no API credits), by the human's decision.
Day19 forbid-only and Day25 runs checked; 4 Day25 tests passed.
```

## Relevant Files

- harness/agent/run-tests.ts
- harness/agent/runner.ts
- harness/agent/implement.ts
- harness/agent/accept.ts
- CLAUDE.md
- .claude/skills/implement-plan/SKILL.md
- .claude/skills/revise-code/SKILL.md
- tests/web/Day19.spec.ts
- tests/web/Day25/TestStandardComponent.spec.ts
- tests/web/Day25/TestCheapComponent.spec.ts
