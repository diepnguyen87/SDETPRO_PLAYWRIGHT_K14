# Implementation Plan: Move `clickOnContinueBtn` out of `Component`

## Objective

Move `continueBtnSel` + `clickOnContinueBtn()` from the base `Component` class into a new
intermediate base class `CheckoutStepComponent`, used only by the checkout step components
that actually have a **Continue** button.

---

## Current State

- `models/components/Component.ts` declares `continueBtnSel = "input[value='Continue']"` and
  `clickOnContinueBtn()`, so every component inherits it (Login, Header, ProductGrid, Cart, ...).
- Only 5 checkout components use it, all called from `test-flows/computer/OrderTestFlow.ts`:
  `BillingAddress`, `ShippingAddress`, `ShippingMethod`, `PaymentMethod`, `PaymentInformation`.
- **Self-healing gap:** `ComponentFailureCollector` copies the source via
  `SourceCodeCollector.find(this.constructor.name)` (e.g. `BillingAddressComponent.ts`), but
  `continueBtnSel` lives in `Component.ts`. `AIResponseValidator` therefore rejects any patch
  because `field` / `oldValue` do not exist in the collected source file.

---

## Design

New abstract class with the method, selector declared `abstract` so each step component
defines it in its own file — the file the healing pipeline collects and patches.

```
Component
    └── CheckoutStepComponent (abstract, NEW)   clickOnContinueBtn()
            ├── BillingAddressComponent          continueBtnSel
            ├── ShippingAddressComponent         continueBtnSel
            ├── ShippingMethodComponent          continueBtnSel
            ├── PaymentMethodComponent           continueBtnSel
            └── PaymentInformationComponent      continueBtnSel
```

```typescript
import Component from "../Component.js";

export default abstract class CheckoutStepComponent extends Component {

    protected abstract continueBtnSel: string

    public async clickOnContinueBtn(): Promise<void> {
        await this.componentLocator.locator(this.continueBtnSel).scrollIntoViewIfNeeded();
        await this.withHealing(this.continueBtnSel, l => l.click());
        await this.componentLocator.locator(this.continueBtnSel).waitFor({ state: "hidden" });
    }
}
```

Method body is unchanged — only relocated.

---

## Changes

| # | File | Change |
|---|------|--------|
| 1 | `models/components/checkout/CheckoutStepComponent.ts` | **NEW** — as above |
| 2 | `models/components/checkout/BillingAddressComponent.ts` | `extends CheckoutStepComponent`, add `protected continueBtnSel = "input[value='Continue']"` |
| 3 | `models/components/checkout/ShippingAddressComponent.ts` | same as #2 |
| 4 | `models/components/checkout/ShippingMethodComponent.ts` | same as #2 |
| 5 | `models/components/checkout/PaymentMethodComponent.ts` | same as #2 |
| 6 | `models/components/checkout/PaymentInformationComponent.ts` | same as #2 |
| 7 | `models/components/Component.ts` | Remove `continueBtnSel` and `clickOnContinueBtn()`. `withHealing()` untouched |

**Unchanged:** `OrderTestFlow.ts`, `CheckoutPage.ts`, `ConfirmOrderComponent`,
`CompletedComponent`, `test-data/pages.json`, test specs, the self-healing pipeline.

---

## Alternatives Rejected

- **Move to `CheckoutPage`** — `withHealing()` is `protected` on `Component` and the Continue
  button must be scoped per step; a page-level method breaks both.
- **Keep a shared selector in the base class** — simpler, but self-healing for the Continue
  button would stay broken (selector not in the collected source file).

---

## Verification

1. `npx tsc --noEmit`
2. Run `TestStandardComponent.spec.ts` and `TestStandardComponentWithLogin.spec.ts` on one
   project (chromium) — both must pass.

---

## Relevant Files

- models/components/Component.ts
- models/components/checkout/CheckoutStepComponent.ts
- models/components/checkout/BillingAddressComponent.ts
- models/components/checkout/ShippingAddressComponent.ts
- models/components/checkout/ShippingMethodComponent.ts
- models/components/checkout/PaymentMethodComponent.ts
- models/components/checkout/PaymentInformationComponent.ts
- test-flows/computer/OrderTestFlow.ts
