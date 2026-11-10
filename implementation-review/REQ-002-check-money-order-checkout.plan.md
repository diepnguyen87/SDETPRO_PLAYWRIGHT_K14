# Plan Review: implementation-plans/REQ-002-check-money-order-checkout.md

- Verdict: **APPROVE_WITH_CHANGES**
- Model: gpt-5.3-codex
- Findings: REQUIRED_FIX 1, RECOMMENDED 11, VERIFICATION 0

## Summary

The plan is generally aligned with the requirement and reuses existing flow/page/component structure correctly. AC1–AC5 are mostly covered with concrete assertions, and the proposed additions are minimal and architecture-consistent. However, there is one requirement-traceability mismatch: AC2 includes proving progression to order review, but the planned/new step assertions do not explicitly verify that transition. Tightening AC2 traceability in the plan will remove ambiguity before implementation.

## Findings

### F1 [MEDIUM] REQUIRED_FIX (AC2)

- File: `implementation-plans/REQ-002-check-money-order-checkout.md`
- Problem: AC2 traceability overstates coverage: the row says the new step proves "Continue then reaches order review (`confirmOrder()` reads its totals)", but the described `selectCheckMoneyOrderPaymentMethod()` implementation only asserts payment-info visibility and absence of `#CardNumber`, then clicks Continue. It does not itself assert that the order review step is reached, and `confirmOrder()` currently has no explicit "step loaded" assertion tied to AC2.
- Action: Update the plan’s AC2 coverage so it includes an explicit verification of reaching order review after clicking Continue (e.g., assert a confirm-order specific element/section is visible before totals checks), or revise the AC2 traceability text to avoid claiming that transition is directly asserted when it is not.

### F2 [LOW] RECOMMENDED

- File: `implementation-plans/REQ-002-check-money-order-checkout.md`
- Problem: `tests/fixtures/base.ts` is listed under Relevant Files, but the plan does not propose any changes to it.
- Action: Remove `tests/fixtures/base.ts` from Relevant Files unless you intend to modify it.

### F3 [LOW] RECOMMENDED

- File: `implementation-plans/REQ-002-check-money-order-checkout.md`
- Problem: `models/pages/CheckoutAsGuestPage.ts` is listed under Relevant Files without planned edits.
- Action: Remove `models/pages/CheckoutAsGuestPage.ts` from Relevant Files unless a code change is actually planned there.

### F4 [LOW] RECOMMENDED

- File: `implementation-plans/REQ-002-check-money-order-checkout.md`
- Problem: `models/pages/CheckoutCompletedPage.ts` is listed under Relevant Files but no modifications are planned.
- Action: Remove `models/pages/CheckoutCompletedPage.ts` from Relevant Files unless changed.

### F5 [LOW] RECOMMENDED

- File: `implementation-plans/REQ-002-check-money-order-checkout.md`
- Problem: `models/pages/OrderDetailsPage.ts` is listed under Relevant Files without planned edits.
- Action: Remove `models/pages/OrderDetailsPage.ts` from Relevant Files unless changed.

### F6 [LOW] RECOMMENDED

- File: `implementation-plans/REQ-002-check-money-order-checkout.md`
- Problem: `models/components/checkout/CheckoutStepComponent.ts` is listed under Relevant Files though no changes are described.
- Action: Remove `models/components/checkout/CheckoutStepComponent.ts` from Relevant Files unless changed.

### F7 [LOW] RECOMMENDED

- File: `implementation-plans/REQ-002-check-money-order-checkout.md`
- Problem: `models/components/checkout/PaymentMethodComponent.ts` appears in Relevant Files but the plan reuses it as-is.
- Action: Remove `models/components/checkout/PaymentMethodComponent.ts` from Relevant Files unless modified.

### F8 [LOW] RECOMMENDED

- File: `implementation-plans/REQ-002-check-money-order-checkout.md`
- Problem: `models/components/checkout/ConfirmOrderComponent.ts` is listed as relevant without planned changes.
- Action: Remove `models/components/checkout/ConfirmOrderComponent.ts` from Relevant Files unless changed.

### F9 [LOW] RECOMMENDED

- File: `implementation-plans/REQ-002-check-money-order-checkout.md`
- Problem: `models/components/checkout/CompletedComponent.ts` is listed under Relevant Files with no planned edits.
- Action: Remove `models/components/checkout/CompletedComponent.ts` from Relevant Files unless changed.

### F10 [LOW] RECOMMENDED

- File: `implementation-plans/REQ-002-check-money-order-checkout.md`
- Problem: `config/pages.json` is listed in Relevant Files, but no plan change is needed/identified.
- Action: Remove `config/pages.json` from Relevant Files unless there is an actual planned edit.

### F11 [LOW] RECOMMENDED

- File: `implementation-plans/REQ-002-check-money-order-checkout.md`
- Problem: `test-data/TestDataProvider.ts` is listed under Relevant Files without planned modifications.
- Action: Remove `test-data/TestDataProvider.ts` from Relevant Files unless changed.

### F12 [LOW] RECOMMENDED

- File: `implementation-plans/REQ-002-check-money-order-checkout.md`
- Problem: `test-data/sit/checkout/OrderCompletedData.json` is listed in Relevant Files but no data change is planned.
- Action: Remove `test-data/sit/checkout/OrderCompletedData.json` from Relevant Files unless changed.

## Assumptions

- No human-provided “→ A:” decisions were supplied in Open Questions, so none were treated as binding.
- The intended implementation keeps using existing `OrderTestFlow.confirmOrder()` for AC3 without broader refactoring.
- Plan validation (`harness:check-plan`) is expected to enforce required template structure, while this review focuses on technical and traceability correctness.

## Validation Checklist

- yarn harness:check-plan implementation-plans/REQ-002-check-money-order-checkout.md
- Confirm the revised AC2 traceability row names an explicit assertion that order review is reached after selecting Check / Money Order and clicking Continue.
- After implementation: yarn tsc --noEmit
- After implementation: yarn playwright test --list --config=playwright.config.web.js
- After implementation: yarn playwright test tests/web/Day25/TestStandardComponent.spec.ts --config=playwright.config.web.js
