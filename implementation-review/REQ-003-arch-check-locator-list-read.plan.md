# Plan Review: implementation-plans/REQ-003-arch-check-locator-list-read.md

- Verdict: **APPROVE_WITH_CHANGES**
- Model: gpt-5.3-codex
- Findings: REQUIRED_FIX 2, RECOMMENDED 1, VERIFICATION 1

## Summary

The plan is largely aligned with the requirement and existing code, especially the migration targets and the R1 gap around `.all()`. However, it contains a few concrete inconsistencies with project rules and requirement traceability expectations that should be fixed before implementation. None of the issues require redesign, but they do require tightening the plan content to avoid scope/rule drift and to keep AC traceability accurate.

## Findings

### F1 [HIGH] REQUIRED_FIX (AC5)

- File: `implementation-plans/REQ-003-arch-check-locator-list-read.md`
- Problem: The plan’s Acceptance Criteria Traceability for AC5 says `yarn harness:check-arch --all` should show only Day20 (and possibly Day19) as new violations, while the planned `LOCATOR_ACTIONS` additions include methods (`elementHandle`, `elementHandles`, etc.) that are likely used outside those two files in the scanned tree. This makes the AC5 proof strategy potentially invalid and under-specified.
- Action: Update the plan to make AC5 verification deterministic: either (a) explicitly constrain the added method set to those validated against repo-wide usage, or (b) add a required pre-check step enumerating current/new `R1` hits for each newly added method and adjust the AC5 statement from 'only Day20/Day19' to the requirement’s exact boundary (`models/` and `test-flows/` clean, with documented expected new non-model/non-flow entries).

### F2 [MEDIUM] REQUIRED_FIX

- File: `implementation-plans/REQ-003-arch-check-locator-list-read.md`
- Problem: Relevant Files includes files planned as unchanged or explicitly out-of-scope for editing (`harness/checks/arch-baseline.json`, `harness/agent/run-tests.ts`, `models/components/Component.ts`, `tests/web/Day19.spec.ts`, `tests/web/Day20.spec.ts`). While reading context is allowed, the plan text also states some of these are not edited, creating avoidable scope ambiguity for implementation and review.
- Action: Refine Relevant Files to include only files read or modified with clear intent. Keep contextual files if needed, but annotate them as read-only context in the plan body or remove them from Relevant Files to reduce scope ambiguity. Ensure no conflict between 'Out of Scope' and listed files.

### F3 [LOW] RECOMMENDED (AC3)

- File: `implementation-plans/REQ-003-arch-check-locator-list-read.md`
- Problem: The method list added to `LOCATOR_ACTIONS` includes names that may not exist on the installed Playwright Locator API (`ariaSnapshotJSON`, `normalize`, `within`, `visible`, etc. are discussed). If non-existent names are listed as enforced behavior, traceability for AC3 can become misleading even if harmless technically.
- Action: In the plan, explicitly separate: 'methods confirmed in installed Playwright version and added' vs 'considered but excluded'. Keep the AC3 fixtures aligned only to confirmed existing methods.

### F4 [MEDIUM] VERIFICATION (AC6, AC7, E2)

- File: `models/pages/ShoppingCartPage.ts`
- Problem: The plan changes `cartItemRowCompList()` to fail fast via `waitFor(first attached)` and updates `removeAllItems()` pre-check logic. This should preserve existing behavior, but it may alter timing in cleanup and order flows under transient cart rendering.
- Action: After implementation, verify Day25 and cart-related flows specifically for cleanup stability and no new flakiness by comparing harness result JSON before/after, including skipped/failed reasons.

## Assumptions

- No human-provided '→ A:' answers exist yet for Q1/Q2, so open questions are not yet binding decisions.
- `LOCATOR_ACTIONS` expansion is intended to remain static-string based in the checker (no type-aware API introspection).
- The plan’s proposed fixture-count extension in `run-fixtures.ts` is acceptable as harness tooling change within scope.

## Validation Checklist

- yarn harness:check-plan implementation-plans/REQ-003-arch-check-locator-list-read.md
- yarn tsc --noEmit
- yarn harness:test
- yarn harness:check-arch --all
- yarn harness:run-tests tests/web/Day25 tests/web/Day22/TestProductItemListComponent.spec.ts tests/web/Day23/TestProductItemListComponent.spec.ts tests/web/Day23/TestFooterFlow.spec.ts tests/web/Day24/TestFooterFlow.spec.ts
- Confirm `harness-results/tests/*.json` before/after show equivalent outcomes for the listed specs (allowing documented skips).
