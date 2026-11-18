# Plan Review: implementation-plans/REQ-004-run-tests-forbid-only.md

- Verdict: **APPROVE_WITH_CHANGES**
- Model: gpt-5.3-codex
- Findings: REQUIRED_FIX 1, RECOMMENDED 1, VERIFICATION 0

## Summary

The plan is solid and aligns well with REQ-004: adding `--forbid-only` in `harness:run-tests`, preserving runner behavior, and documenting the rule in CLAUDE/skills is the right approach. Traceability is mostly complete and references concrete verification runs and result-file assertions. I found one required mismatch in AC4 expectations versus current source behavior and one recommendation to reduce ambiguity in AC3/E1 checks.

## Findings

### F1 [MEDIUM] REQUIRED_FIX (AC4)

- File: `implementation-plans/REQ-004-run-tests-forbid-only.md`
- Problem: AC4 traceability expects the global error line to print *after* the summary counts line (`A line ... after the '0 passed, 0 failed, 0 skipped' line`), and the Harness change section repeats that ordering. But in current `harness/agent/run-tests.ts`, non-zero-test lines are printed after summary; with the proposed addition, ordering is an implementation choice not required by REQ-004. Hard-coding this specific order in the plan can cause unnecessary failure if implementation prints the error line before counts while still satisfying the requirement ('prints ... on one line').
- Action: Relax AC4 assertion wording in the plan to require presence of a single-line forbid-only error in console summary output, without mandating exact relative order to the counts line. Keep examples, but remove strict 'after' dependency in traceability and Harness change bullets.

### F2 [LOW] RECOMMENDED (AC3, E1)

- File: `implementation-plans/REQ-004-run-tests-forbid-only.md`
- Problem: AC3/E1 assertions require `tests` to be empty. Depending on Playwright JSON reporter behavior/version, `tests` can occasionally include discovered entries with non-executed statuses even when forbid-only aborts execution. This could make validation brittle despite correct behavior.
- Action: Adjust AC3/E1 verification phrasing to primary signals: non-zero exit, `passed` = 0, and `globalErrors` containing forbid-only message + focused test/file. Treat `tests` empty as expected-but-not-mandatory.

## Assumptions

- Playwright CLI `--forbid-only` behavior in this repo matches the requirement note and fails before running tests when focused items are in included specs.
- No additional rule file beyond CLAUDE.md applies to the touched files for this plan review.

## Validation Checklist

- Run: `yarn harness:run-tests tests/web/Day25/TestStandardComponent.spec.ts tests/web/Day25/TestCheapComponent.spec.ts` and verify result JSON `command` includes `--forbid-only` with normal pass behavior.
- Run: `yarn harness:run-tests tests/web/Day19.spec.ts` and verify non-zero process exit, result JSON `exitCode != 0`, `passed == 0`, and `globalErrors` includes forbid-only text with Day19 focused test reference.
- Run: `yarn harness:run-tests tests/web/Day19.spec.ts tests/web/Day25/TestStandardComponent.spec.ts` and verify whole run fails with forbid-only global error (no false success).
- Run: `yarn harness:run-tests tests/web/Day25/TestStandardComponent.spec.ts --forbid-only` and verify parse rejection (exit 2) and no new test result file.
- Confirm docs text updated in `CLAUDE.md`, `.claude/skills/implement-plan/SKILL.md`, `.claude/skills/revise-code/SKILL.md` to state focused tests fail `harness:run-tests` and must be removed/reported.
