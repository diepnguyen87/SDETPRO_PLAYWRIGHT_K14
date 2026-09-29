# Implementation Plan: Terms of Service Warning Popup on Checkout

## Objective

Verify that when the user clicks **Checkout** on the Shopping Cart page **without** accepting
the Terms of Service, a warning popup is displayed and the user stays on the cart page.

The check is added as **one extra step** in the two existing checkout specs — no new spec file.

---

## Scenario (new step)

Runs right after `verifyShoppingCart()` and before the existing TOS + Checkout step.

| Step | Action | Expected |
|---|---|---|
| 1 | Verify Terms of Service checkbox state | Unchecked (precondition) |
| 2 | Click **Checkout** without ticking Terms of Service | Warning popup is visible |
| 3 | Verify popup content | Title = `Terms of service`, message = `Please accept the terms of service before the next step.` |
| 4 | Verify navigation | URL is still `/cart` (checkout blocked) |
| 5 | Close the popup | Popup is hidden |

The checkbox is left unchecked, so the next existing step (`selectTOSandCheckoutAsGuest()` /
`selectTOSandCheckoutWithLogin()`) ticks it and continues the checkout as today.

---

## Application Behavior (to verify against live DOM before coding)

On demowebshop the warning is a jQuery UI dialog, appended to the end of `<body>`:

```html
<div class="ui-dialog ..." role="dialog" aria-labelledby="ui-dialog-title-terms-of-service-warning-box">
    <div class="ui-dialog-titlebar">
        <span class="ui-dialog-title" id="ui-dialog-title-terms-of-service-warning-box">Terms of service</span>
        <a class="ui-dialog-titlebar-close" role="button"><span>close</span></a>
    </div>
    <div id="terms-of-service-warning-box" class="ui-dialog-content">
        <p>Please accept the terms of service before the next step.</p>
    </div>
</div>
```

- The dialog is outside `TotalComponent` (`.order-summary-content .totals`), so its locators
  are declared directly in `ShoppingCartPage` (see change 2).
- **Step 0 of implementation:** open the cart page in a browser, click Checkout without TOS,
  and confirm `role="dialog"`, its accessible name, the close button role/name and the message
  element. Adjust locators if the DOM differs.

---

## Layer Flow

```
TestStandardComponent.spec.ts / TestStandardComponentWithLogin.spec.ts
    └── OrderTestFlow
            ├── buildComputerDetailListAndAddToCart        (existing)
            ├── navigateToShoppingCartPage                 (existing, BaseFlow)
            ├── verifyShoppingCart                         (existing)
            ├── checkoutWithoutTOSAndVerifyWarningPopup    (NEW step)
            │       └── ShoppingCartPage
            │               ├── totalComp()                → TotalComponent (+1 accessor, +0 actions)
            │               └── tosWarningDialog / tosWarningMessage / closeTosWarningDialog()  (NEW, page-level)
            ├── selectTOSandCheckoutAsGuest | selectTOSandCheckoutWithLogin   (existing)
            └── ... remaining checkout (existing)
```

---

## Changes

### 1. UPDATE — `models/components/cart/TotalComponent.ts`

Add one accessor so the flow can assert the precondition (checkbox unchecked) with a
web-first assertion. Follows the existing `CartItemRowComponent.qualityInput()` pattern.
No change to existing methods.

```typescript
public termOfServiceCheckbox(): Locator {
    return this.componentLocator.locator(this.termOfServiceSel)
}
```

### 2. UPDATE — `models/pages/ShoppingCartPage.ts`

No new component: the dialog is small and not reused anywhere, so its locators are declared
directly in the page (CLAUDE.md: "Locators that do not belong to a component are defined in the page").

- Locators are class properties, not inline in methods.
- Pages have no `withHealing()`, so the dialog and the close button use `getByRole()`
  (inherently stable, allowed to `.click()` directly per CLAUDE.md).
- The message element has no role; it is only read through web-first assertions
  (`toHaveText`), never interacted with.

```typescript
export default class ShoppingCartPage extends BasePage {

    private readonly tosWarningDialogLoc: Locator
    private readonly tosWarningMessageSel = "#terms-of-service-warning-box"

    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo)
        this.tosWarningDialogLoc = this.page.getByRole("dialog", { name: "Terms of service" })
    }

    // ... existing cartItemRowCompList(), totalComp() unchanged

    public tosWarningDialog(): Locator {
        return this.tosWarningDialogLoc
    }

    public tosWarningMessage(): Locator {
        return this.tosWarningDialogLoc.locator(this.tosWarningMessageSel)
    }

    public async closeTosWarningDialog(): Promise<void> {
        await this.tosWarningDialogLoc.getByRole("button", { name: "close" }).click()
    }
}
```

The dialog title is covered by the accessible name in `getByRole("dialog", { name: ... })`,
so no separate title locator is needed.

### 3. NEW — `test-data/checkout/TermsOfServiceWarningData.json`

Expected popup text lives in test data, not in source.

```json
{
    "title": "Terms of service",
    "message": "Please accept the terms of service before the next step."
}
```

`title` is kept only if the dialog locator takes the title as a parameter — see Open Questions.

### 4. UPDATE — `test-flows/computer/OrderTestFlow.ts`

Add one flow method. It calls Page/Component methods only; assertions use web-first `expect`.

```typescript
import termsOfServiceWarningData from "../../test-data/checkout/TermsOfServiceWarningData.json" assert { type: "json" };

public async checkoutWithoutTOSAndVerifyWarningPopup(): Promise<void> {
    const { message } = termsOfServiceWarningData
    const shoppingCartPage: ShoppingCartPage = new ShoppingCartPage(this.page, this.testInfo)
    const totalComp = shoppingCartPage.totalComp()

    await expect(totalComp.termOfServiceCheckbox()).not.toBeChecked()
    await totalComp.clickOnCheckoutBtn()

    await expect(shoppingCartPage.tosWarningDialog()).toBeVisible()
    await expect(shoppingCartPage.tosWarningMessage()).toHaveText(message)
    await expect(this.page).toHaveURL(/\/cart$/)

    await shoppingCartPage.closeTosWarningDialog()
    await expect(shoppingCartPage.tosWarningDialog()).toBeHidden()
}
```

### 5. UPDATE — `tests/web/Day25/TestStandardComponent.spec.ts`

Add one step after `verifyShoppingCart()`:

```typescript
    await orderTestFlow.verifyShoppingCart()
+   await orderTestFlow.checkoutWithoutTOSAndVerifyWarningPopup()
    await orderTestFlow.selectTOSandCheckoutAsGuest()
```

### 6. UPDATE — `tests/web/Day25/TestStandardComponentWithLogin.spec.ts`

Add one step after `verifyShoppingCart()`:

```typescript
    await orderTestFlow.verifyShoppingCart();
+   await orderTestFlow.checkoutWithoutTOSAndVerifyWarningPopup();
    await orderTestFlow.selectTOSandCheckoutWithLogin(email!, password!);
```

### 7. DONE — `CLAUDE.md`

Test Data rule updated: load JSON via `import data from "../test-data/xxx.json" assert { type: "json" };`
(replaces the `DataObjectBuilder.readJsonFile<T>()` rule, matching existing code).

No change to `test-data/pages.json`: no new Page Object is added.

---

## Impact

- Both specs are tagged `@Smoke`, so the new step runs in the smoke workflows
  (`smoke-github-hosted.yml`, `smoke-github-hosted-matrix.yml`).
- If the popup check fails, the whole checkout test fails at that step — the rest of the
  checkout is not exercised in that run.

---

## Open Questions

1. **Dialog title source:** the accessible name `"Terms of service"` is declared in `ShoppingCartPage`
   (as a locator, like other locators). Alternative: `tosWarningDialog(title)` with `title` from
   `TermsOfServiceWarningData.json`, then drop the hardcoded name from the page. Which do you prefer?
   If the page keeps the name, `title` is removed from the JSON.

---

## Verification

1. Step 0: confirm the dialog DOM and locators in a real browser.
2. Run both specs:
   `yarn playwright test tests/web/Day25/TestStandardComponent.spec.ts tests/web/Day25/TestStandardComponentWithLogin.spec.ts --project=chromium --config=playwright.config.web.js`
3. Confirm both pass and that no self-healing was triggered (check `artifacts/` and `logs/`).

---

## Relevant Files

- `models/components/cart/TotalComponent.ts`
- `models/pages/ShoppingCartPage.ts`
- `test-data/checkout/TermsOfServiceWarningData.json` (new)
- `test-flows/computer/OrderTestFlow.ts`
- `tests/web/Day25/TestStandardComponent.spec.ts`
- `tests/web/Day25/TestStandardComponentWithLogin.spec.ts`
- `CLAUDE.md`
