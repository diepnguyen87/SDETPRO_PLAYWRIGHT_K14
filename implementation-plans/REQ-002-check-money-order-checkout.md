# Implementation Plan: Complete Checkout Using Check / Money Order

Status: Awaiting Human Review
Requirement: requirements/REQ-002-check-money-order-checkout.md

## Objective

Add a guest checkout test with Check / Money Order to `tests/web/Day25/TestStandardComponent.spec.ts`, next to the Credit Card and Cash On Delivery tests. The existing `OrderTestFlow` steps already cover building the computers, cart verification, guest checkout, addresses, shipping, total checks on order review, order completion and the payment method on the order details. The change adds one flow step for the Check / Money Order payment information (asserting that no credit card form is shown), an explicit URL assertion when entering guest checkout, a `withHealing()` wait and a `withHealing()` count read in `PaymentInformationComponent`, and a `withHealing()` wait in `ConfirmOrderComponent` (to confirm that order review is reached).

## Acceptance Criteria Traceability

| ID | Covered by (spec › flow step) | Assertion |
|---|---|---|
| AC1 | `Test Check Money Order Checkout` › `OrderTestFlow.verifyShoppingCart()` + `OrderTestFlow.selectTOSandCheckoutAsGuest()` | `expect(subTotal).toEqual(this.rawTotalPrice)` on the cart (configured products present); `await expect(this.page).toHaveURL(/\/onepagecheckout/)` after **Checkout as Guest** (new) |
| AC2 | `Test Check Money Order Checkout` › `OrderTestFlow.selectCheckMoneyOrderPaymentMethod()` (new) | `await paymentInformationComp.waitForPaymentInfo()` (step loaded); `expect(await paymentInformationComp.getCardNumberInputCount()).toBe(0)` (no card number field); after Continue, `await checkoutPage.confirmOrderComp().waitForConfirmStep()` (order review reached — throws if the Confirm button does not become visible) |
| AC3 | `Test Check Money Order Checkout` › `OrderTestFlow.confirmOrder()` | `expect(subTotal).toEqual(this.rawTotalPrice)`; `expect(shipping).toEqual(this.shippingPrice)`; `expect(paymentMethodAdditionalFee ?? 0).toEqual(this.additionalFee)` (Check fee read from the `Check / Money Order (5.00)` label); `expect(subTotal + shipping + paymentMethodAdditionalFee + tax).toEqual(finalPrice)` |
| AC4 | `Test Check Money Order Checkout` › `OrderTestFlow.checkoutCompleted()` | `expect(getOrderCompletedTitle()).toEqual(orderCompletedData.title)`; `expect(getOrderDetailLinkText()).toEqual(orderCompletedData.orderDetailLinkText)`; `getOrderDetailLinkHref()` equals `/orderdetails/<orderNumber>`, with `orderNumber` parsed as digits from the "Order number" line |
| AC5 | `Test Check Money Order Checkout` › `OrderTestFlow.verifyOrderDetailsPaymentMethod(paymentMethods.check)` | `expect(await orderDetailsPage.getPaymentMethod()).toContain("Check / Money Order")` |

## Scenarios

`${TAG.smoke} | Test Check Money Order Checkout` — guest, fresh browser context per test, so the cart starts empty (requirement precondition). Data: `testData.standardComputer` (all entries, same as the other two checkout tests).

| Step | Flow call | Expected |
|---|---|---|
| 1 | `page.goto("/build-your-own-computer")`, `new OrderTestFlow(page, StandardComputerComponent, undefined, standardComputerDataList, testInfo)` | — |
| 2 | `buildComputerDetailListAndAddToCart()` | each add shows the success notification and header quantity +1 |
| 3 | `navigateToShoppingCartPage()`, `verifyShoppingCart()` | row totals and Sub-Total match the configured products (AC1) |
| 4 | `checkoutWithoutTOSAndVerifyWarningPopup()` | TOS warning shown, still on `/cart` (kept for parity with the other checkout tests) |
| 5 | `selectTOSandCheckoutAsGuest()` | URL `/onepagecheckout` (AC1) |
| 6 | `inputBillingAddress()`, `inputShippingAddress()`, `selectShippingMethod()` | billing data from `testData.billingAddress`, random shipping method |
| 7 | `selectCheckMoneyOrderPaymentMethod()` | Check / Money Order selected, payment information shows no card number field, Continue, order review step with Confirm button visible (AC2) |
| 8 | `confirmOrder()` | totals consistent incl. Check fee (AC3), order confirmed |
| 9 | `checkoutCompleted()` | success title, order number, order details link (AC4) |
| 10 | `verifyOrderDetailsPaymentMethod(paymentMethods.check)` | order details payment method contains `Check / Money Order` (AC5) |

## Reuse

- `tests/fixtures/base.ts` — `test` (self-healing guard).
- `constant/Tag.ts` — `TAG.smoke`.
- `constant/PaymentMethod.ts` — `paymentMethods.check` (`'Check / Money Order'`).
- `test-data/TestDataProvider.ts` — `testData.standardComputer`, `billingAddress`, `shippingMethod`, `termsOfServiceWarning`, `orderCompleted` (all already registered).
- `models/components/computer/StandardComputerComponent.ts` — passed to `OrderTestFlow`.
- `test-flows/BaseFlow.ts` — `navigateToShoppingCartPage()`.
- `test-flows/computer/OrderTestFlow.ts` — `buildComputerDetailListAndAddToCart()`, `verifyShoppingCart()`, `checkoutWithoutTOSAndVerifyWarningPopup()`, `inputBillingAddress()`, `inputShippingAddress()`, `selectShippingMethod()`, `selectPaymentMethod(paymentMethod)` (its `check` branch calls `PaymentMethodComponent.selectCheckMoneyOrder()` and stores the fee in `additionalFee`), `confirmOrder()`, `checkoutCompleted()`, `verifyOrderDetailsPaymentMethod(paymentMethod)`.
- `models/pages/CheckoutPage.ts` — `paymentInformationComp()`, `confirmOrderComp()`.
- `models/pages/CheckoutCompletedPage.ts` — `orderCompletedComp()`.
- `models/pages/OrderDetailsPage.ts` — `getPaymentMethod()`.
- `models/components/checkout/PaymentMethodComponent.ts` — `selectCheckMoneyOrder()` (`input[value='Payments.CheckMoneyOrder']`, fee from its label; confirmed in `artifacts/Desktop Chromium/_Smoke_Test_Standard_Component_With_Login/dom.html`: `Check / Money Order (5.00)`).
- `models/components/checkout/CheckoutStepComponent.ts` — `clickOnContinueBtn()` (waits for the step's Continue button to hide).
- `models/components/checkout/ConfirmOrderComponent.ts` — `clickOnConfirmBtn()`, `totalComp()` (plus the new `waitForConfirmStep()` below).
- `models/components/checkout/CompletedComponent.ts`, `models/components/cart/TotalComponent.ts` — unchanged.
- `config/pages.json` — `/cart`, `/login/checkoutasguest`, `/onepagecheckout`, `/checkout/completed`, `/orderdetails/:id` already registered.

## Changes by Layer

### Spec
- `tests/web/Day25/TestStandardComponent.spec.ts` — add a test titled `${TAG.smoke} | Test Check Money Order Checkout` with the steps above, same structure as `Test Cash On Delivery Checkout`. No new imports (`paymentMethods`, `TAG`, `testData`, `OrderTestFlow`, `StandardComputerComponent` are already imported). The two existing tests are left unchanged.

### TestFlow
`test-flows/computer/OrderTestFlow.ts`:
- `public async selectCheckMoneyOrderPaymentMethod(): Promise<void>` (new) — `await this.selectPaymentMethod(paymentMethods.check)`; get `checkoutPage.paymentInformationComp()`; `await paymentInformationComp.waitForPaymentInfo()` (the step has loaded, so the next check is not vacuous); `expect(await paymentInformationComp.getCardNumberInputCount()).toBe(0)` (AC2: no credit card information requested — a single read is enough after the wait, `expect.poll()` would not add anything for an expected 0); `await paymentInformationComp.clickOnContinueBtn()`; `await checkoutPage.confirmOrderComp().waitForConfirmStep()` (AC2: order review reached).
- `selectTOSandCheckoutAsGuest()` — after `clickOnCheckoutAsGuestBtn()`, add `await expect(this.page).toHaveURL(/\/onepagecheckout/)` (AC1), the same assertion `selectTOSAndCheckout()` already makes. The Credit Card and Cash On Delivery tests use this step too; the assertion only makes their existing behaviour explicit.

### Page Object
- None.

### Component
`models/components/checkout/PaymentInformationComponent.ts`:
- `private paymentInfoSel = ".section.payment-info"` (from `artifacts/**/dom.html`: `<div class="section payment-info">` inside `#opc-payment_info`).
- `public async waitForPaymentInfo(): Promise<void>` → `await this.withHealing(this.paymentInfoSel, l => l.waitFor())`.
- `public async getCardNumberInputCount(): Promise<number>` → `return await this.withHealing(this.cardNumberInputSel, l => l.count())` (reuses the existing `cardNumberInputSel = "#CardNumber"`).

`models/components/checkout/ConfirmOrderComponent.ts`:
- `public async waitForConfirmStep(): Promise<void>` → `await this.withHealing(this.confirmBtnSel, l => l.waitFor())` (reuses the existing `confirmBtnSel = "input.confirm-order-next-step-button"`; the CLAUDE.md example pattern).

No `Locator` getters are added to either component (CLAUDE.md, Components: CSS locators are never exposed through getters).

### Test Data
- None (all keys exist; payment method name from `constant/PaymentMethod.ts`).

### Config
- None.

## Out of Scope

- Credit Card, Cash On Delivery and Purchase Order checkout (existing tests untouched apart from the shared AC1 URL assertion).
- Logged-in checkout (`TestComponentWithLogin.spec.ts`).
- Asserting the Check / Money Order mailing instructions text on the payment information step (not required by the requirement).
- Refactoring `selectCashOnDeliveryPaymentMethod()` into a shared step, or removing the `waitForTimeout()` calls in `buildComputerDetailAndAddToCart()` / `confirmOrder()` / the Credit Card test.

## Risks

- The Check / Money Order payment information content has not been captured in `artifacts/` (the saved DOM shows the Credit Card form). The plan assumes `.section.payment-info` wraps the step content for every payment method, as it does for Credit Card; confirm on the first run and adjust `paymentInfoSel` only if the step uses a different wrapper.
- `getCardNumberInputCount()` returning 0 would also pass if the card form were present but not yet rendered; the preceding `waitForPaymentInfo()` synchronises on the loaded step. The Ajax step replaces the whole `#checkout-payment-info-load` content at once, so a partly rendered form is not expected.
- `count()` never throws, so `#CardNumber` is never healed through this read, and a renamed card field would make the absence check pass vacuously. Accepted: the absence of the card form is exactly what AC2 checks, and the Credit Card test still fills `#CardNumber` through `withHealing()`, so a renamed field surfaces there.
- `waitForPaymentInfo()` / `waitForConfirmStep()` use `Locator.waitFor()`, bounded by `actionTimeout` (5 s in `playwright.config.web.js`). A timeout fails as an action error inside `withHealing()` and goes to component healing (`ComponentFailureCollector`), not assertion healing. If the Ajax step regularly takes longer than 5 s, report it rather than adding a timeout.
- The new test builds every `standardComputer` entry and runs the full checkout, adding about the same runtime as the Cash On Delivery test to `@Smoke`.
- Each run creates a real order on the shared demo shop, as the existing checkout tests do.

## Open Questions

- Q1: Location and tag — add the test to `tests/web/Day25/TestStandardComponent.spec.ts` with `TAG.smoke` (planned, like the Credit Card and Cash On Delivery tests), or a separate spec / `TAG.regression`?
- Q2: AC1 adds `toHaveURL(/\/onepagecheckout/)` to the shared `selectTOSandCheckoutAsGuest()` (planned). Is changing this shared step acceptable, or should the URL check live only in the new step path?
- Q3: AC4 relies on the existing `checkoutCompleted()` check that the order details href equals `/orderdetails/<parsed order number>`. Should an explicit `expect(orderNumber).toMatch(/^\d+$/)` be added to `checkoutCompleted()` as well?

## Human Review Notes
- H1: Replace the CSS Locator getters (paymentInfo, cardNumberInput, confirmBtn) with withHealing wait/read methods per CLAUDE.md

## Verification

1. `yarn tsc --noEmit` → 0 errors.
2. `yarn playwright test --list --config=playwright.config.web.js` → `@Smoke | Test Check Money Order Checkout` is listed.
3. `yarn playwright test tests/web/Day25/TestStandardComponent.spec.ts --config=playwright.config.web.js` (Desktop Chromium) → 3 passed (Credit Card, Cash On Delivery, Check Money Order; the first two also exercise the changed `selectTOSandCheckoutAsGuest()`).

## Review Resolution

Review: `implementation-review/REQ-002-check-money-order-checkout.plan.json` — verdict `APPROVE_WITH_CHANGES`.

- F1 Accepted: `confirmOrder()` only reads totals with no step-loaded assertion (`OrderTestFlow.ts:302-305`), so AC2 coverage was overstated. The new `selectCheckMoneyOrderPaymentMethod()` now ends with `await expect(checkoutPage.confirmOrderComp().confirmBtn()).toBeVisible()`, using a new read-only `ConfirmOrderComponent.confirmBtn()` accessor over the existing `confirmBtnSel`. Updated the Traceability AC2 row, Scenario step 7, Changes by Layer (TestFlow + Component), Reuse, Risks and Objective.
- F2 Rejected: under the plan contract, Relevant Files lists every file read for the design or changed (`.claude/skills/write-plan/SKILL.md:46`), and `ai/review.ts` sends these files to the reviewer as context. `tests/fixtures/base.ts` provides the spec's `test` (self-healing guard) and has to be read to confirm that the new test keeps it.
- F3 Rejected: same contract. `CheckoutAsGuestPage.ts` holds `clickOnCheckoutAsGuestBtn()`, the call right before the new AC1 URL assertion in `selectTOSandCheckoutAsGuest()`.
- F4 Rejected: same contract. `CheckoutCompletedPage.ts` provides `orderCompletedComp()`, which AC4 / AC5 (`checkoutCompleted()`, `verifyOrderDetailsPaymentMethod()`) rely on.
- F5 Rejected: same contract. `OrderDetailsPage.getPaymentMethod()` is the source of the AC5 assertion.
- F6 Rejected: same contract. `CheckoutStepComponent.clickOnContinueBtn()` is the Continue action in the new step (and the reason the `paymentInfo()` sync is needed).
- F7 Rejected: same contract. `PaymentMethodComponent.selectCheckMoneyOrder()` selects the method and returns the fee that AC3 checks.
- F8 Rejected: the finding no longer applies. `ConfirmOrderComponent.ts` now changes (new `confirmBtn()` accessor, per F1).
- F9 Rejected: same contract. `CompletedComponent.ts` provides the order number, title and link getters behind AC4.
- F10 Rejected: same contract. `config/pages.json` was read to confirm `/onepagecheckout`, `/checkout/completed` and `/orderdetails/:id` are registered, so `ensureLoaded()` works without a config change.
- F11 Rejected: same contract. `TestDataProvider.ts` was read to confirm all needed data keys (`standardComputer`, `billingAddress`, `orderCompleted`, …) are already registered.
- F12 Rejected: same contract. `OrderCompletedData.json` holds the expected title and link text for AC4.
- H1 Done: replaced the three CSS `Locator` getters with `withHealing()` methods: `PaymentInformationComponent.waitForPaymentInfo()` (`l => l.waitFor()`) and `getCardNumberInputCount()` (`l => l.count()`), `ConfirmOrderComponent.waitForConfirmStep()` (`l => l.waitFor()`). The flow step now awaits the waits and asserts `expect(await getCardNumberInputCount()).toBe(0)`. Updated Objective, Traceability AC2, Changes by Layer (TestFlow + Component), Reuse and Risks (vacuous-count risk, `actionTimeout` bound, action instead of assertion healing). The F1 intent (explicit order-review check) is kept via `waitForConfirmStep()`.

## Relevant Files

- requirements/REQ-002-check-money-order-checkout.md
- tests/web/Day25/TestStandardComponent.spec.ts
- tests/fixtures/base.ts
- constant/PaymentMethod.ts
- constant/Tag.ts
- test-flows/BaseFlow.ts
- test-flows/computer/OrderTestFlow.ts
- models/pages/CheckoutAsGuestPage.ts
- models/pages/CheckoutPage.ts
- models/pages/CheckoutCompletedPage.ts
- models/pages/OrderDetailsPage.ts
- models/components/checkout/CheckoutStepComponent.ts
- models/components/checkout/PaymentMethodComponent.ts
- models/components/checkout/PaymentInformationComponent.ts
- models/components/checkout/ConfirmOrderComponent.ts
- models/components/checkout/CompletedComponent.ts
- config/pages.json
- test-data/TestDataProvider.ts
- test-data/sit/checkout/OrderCompletedData.json
