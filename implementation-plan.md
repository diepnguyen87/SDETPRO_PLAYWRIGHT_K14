# Implementation Plan: TestStandardComponentWithLogin

## Objective

Improve the existing `TestStandardComponent.spec.ts` checkout flow by adding login.
Login happens **on the CheckoutAsGuestPage** (mid-flow), not as a pre-condition before navigating to the computer page.

---

## Checkout Flow Comparison

| Step | Guest (existing) | With Login (new) |
|---|---|---|
| Navigate | `/build-your-own-computer` | `/build-your-own-computer` |
| Build & add to cart | same | same |
| Verify cart | same | same |
| Click Checkout | → CheckoutAsGuestPage | → CheckoutAsGuestPage |
| Guest/Login choice | Click "Checkout as Guest" | Fill credentials → click Login |
| Billing address | same | same (already handles saved-address dropdown) |
| Remaining checkout | same | same |

---

## Layer Flow

```
TestStandardComponentWithLogin.spec.ts
    └── OrderTestFlow
            ├── buildComputerDetailListAndAddToCart  → ComputerDetailPage → StandardComputerComponent
            ├── navigateToShoppingCartPage           → BaseFlow
            ├── verifyShoppingCart                   → ShoppingCartPage → CartItemRowComponent
            ├── selectTOSandCheckoutWithLogin        → ShoppingCartPage → CheckoutAsGuestPage → LoginComponent  ← NEW
            ├── inputBillingAddress                  → CheckoutPage → BillingAddressComponent
            ├── inputShippingAddress                 → CheckoutPage → ShippingAddressComponent
            ├── selectShippingMethod                 → CheckoutPage → ShippingMethodComponent
            ├── selectPaymentMethod                  → CheckoutPage → PaymentMethodComponent
            ├── inputPaymentInfo                     → CheckoutPage → PaymentInformationComponent
            ├── confirmOrder                         → CheckoutPage → ConfirmOrderComponent
            └── checkoutCompleted                    → CheckoutPage → CompletedComponent
```

---

## Files and Changes

### 1. `models/pages/CheckoutAsGuestPage.ts` — MODIFY

**Why:** When the user clicks Checkout without a session, nopCommerce redirects to
`/login?returnUrl=...` which renders the same `.login-page` DOM wrapper used by `LoginPage`.
`CheckoutAsGuestPage` currently only exposes `clickOnCheckoutAsGuestBtn()`.
It needs to also expose the login form so `OrderTestFlow` can log in mid-flow.

**What:** Add a `loginComp()` method that returns a `LoginComponent` instance.
`LoginComponent` uses `@selector(".login-page")` which matches the DOM on this redirect URL —
no new component is needed.

```typescript
loginComp(): LoginComponent {
    return new LoginComponent(
        this.page,
        this.page.locator(LoginComponent.selectorValue),
        this.testInfo
    );
}
```

---

### 2. `models/components/LoginComponent.ts` — MODIFY

**Why:** After clicking Login, the browser navigates away and `LoginComponent` disappears from
the DOM. Since `LoginComponent` is shared between `LoginPage` and `CheckoutAsGuestPage`, the
next page is not known at call site — the only stable, page-agnostic signal that navigation
has completed is the component itself becoming hidden. Encapsulating the wait inside
`clickLoginBtn()` makes every caller automatically safe without extra steps.

**What:** Extend `clickLoginBtn()` to wait for the component root to be hidden after clicking.

```typescript
public async clickLoginBtn(): Promise<void> {
    await this.componentLocator.getByRole('button', { name: 'Log in' }).click();
    await this.componentLocator.waitFor({ state: 'hidden' });
}
```

---

### 3. `test-flows/computer/OrderTestFlow.ts` — MODIFY

**Why:** The existing `selectTOSandCheckoutAsGuest()` always clicks "Checkout as Guest" after
landing on the login/guest page. For the login path we instead fill credentials and click Login.
After login, the app navigates back to `ShoppingCartPage` — a second Checkout click is needed
(this time logged in, so it goes directly to `onepagecheckout`).
A separate method keeps the existing guest test unchanged.

**What:** Add one new public method `selectTOSandCheckoutWithLogin(email, password)`.

```typescript
public async selectTOSandCheckoutWithLogin(email: string, password: string): Promise<void> {
    const shoppingCartPage: ShoppingCartPage = new ShoppingCartPage(this.page, this.testInfo)
    await shoppingCartPage.totalComp().selectTermOfService()
    await shoppingCartPage.totalComp().clickOnCheckoutBtn()

    const checkoutAsGuestPage: CheckoutAsGuestPage = new CheckoutAsGuestPage(this.page, this.testInfo)
    const loginComp = checkoutAsGuestPage.loginComp()
    await loginComp.inputEmail(email)
    await loginComp.inputPassword(password)
    await loginComp.clickLoginBtn()  // waits for LoginComponent to disappear internally

    // Back on ShoppingCartPage — click Checkout again (logged in → goes directly to onepagecheckout)
    await shoppingCartPage.totalComp().clickOnCheckoutBtn()
}
```

---

### 3. `tests/web/Day25/TestStandardComponentWithLogin.spec.ts` — CREATE NEW

**Why:** New test that exercises the logged-in checkout path.
Credentials are read from environment variables (`LOGIN_EMAIL`, `LOGIN_PASSWORD`) —
the same pattern used in `tests/web/Login.spec.ts`.

```typescript
import "dotenv/config";
import { test } from "../../fixtures/base.js";
import paymentMethods from "../../../constant/PaymentMethod.js";
import StandardComputerComponent from "../../../models/components/computer/StandardComputerComponent.js";
import standardComputerDataList from "../../../test-data/StandardComputer.json" assert { type: "json" };
import OrderTestFlow from "../../../test-flows/computer/OrderTestFlow.js";
import { getCreditCardNumber } from "../../../utils/GetCreditCardNumber.js";
import { TAG } from "../../../constant/Tag.js";

test(`${TAG.smoke} | Test Standard Component With Login`, async ({ page }, testInfo) => {
    test.skip(
        !process.env.LOGIN_EMAIL || !process.env.LOGIN_PASSWORD,
        'LOGIN_EMAIL and LOGIN_PASSWORD env vars must be set to run this test'
    );

    const email = process.env.LOGIN_EMAIL!;
    const password = process.env.LOGIN_PASSWORD!;

    await page.goto('/build-your-own-computer');
    const orderTestFlow = new OrderTestFlow(page, StandardComputerComponent, undefined, standardComputerDataList, testInfo);
    await orderTestFlow.buildComputerDetailListAndAddToCart();
    await orderTestFlow.navigateToShoppingCartPage();
    await orderTestFlow.verifyShoppingCart();
    await orderTestFlow.selectTOSandCheckoutWithLogin(email, password);
    await orderTestFlow.inputBillingAddress();
    await orderTestFlow.inputShippingAddress();
    await orderTestFlow.selectShippingMethod();
    await orderTestFlow.selectPaymentMethod(paymentMethods.creditCard);
    await orderTestFlow.inputPaymentInfo(await getCreditCardNumber('Visa'));
    await orderTestFlow.confirmOrder();
    await orderTestFlow.checkoutCompleted();
});
```

---

## Files with No Changes Required

| File | Reason |
|---|---|
| `models/pages/LoginPage.ts` | Not used in this flow |
| `test-flows/LoginTestFlow.ts` | Not used in this flow |
| `test-data/LoginData.json` | Valid credentials come from `LOGIN_EMAIL` / `LOGIN_PASSWORD` env vars |
| `test-data/StandardComputer.json` | Reused as-is |
| `test-data/checkout/BillingAddressData.json` | Reused as-is |

---

## Relevant Files

### Files to modify
- `models/components/LoginComponent.ts` — extend `clickLoginBtn()` to wait for component hidden
- `models/pages/CheckoutAsGuestPage.ts` — add `loginComp()` method
- `test-flows/computer/OrderTestFlow.ts` — add `selectTOSandCheckoutWithLogin(email, password)`

### Files to create
- `tests/web/Day25/TestStandardComponentWithLogin.spec.ts`

### Files to reuse and review
- `test-flows/LoginTestFlow.ts` — not used in this flow; no changes needed
- `models/pages/LoginPage.ts` — not used in this flow; no changes needed
- `test-data/StandardComputer.json` — reused as-is
- `test-data/checkout/BillingAddressData.json` — reused as-is
- `test-data/LoginData.json` — not used; credentials come from `LOGIN_EMAIL` / `LOGIN_PASSWORD` env vars

---

## Key Decisions

- **Login location:** Mid-flow on `CheckoutAsGuestPage`, not a precondition at `/login`.
- **Component reuse:** `LoginComponent` works on the checkout redirect page without modification.
- **Credential source:** Environment variables only — never hardcoded.
- **Existing test unchanged:** `selectTOSandCheckoutAsGuest()` (guest path) is not modified; the new method is additive.
- **Self-healing preserved:** `LoginComponent.inputEmail()` and `inputPassword()` use `getByLabel()` (stable, no healing needed). `clickLoginBtn()` uses `getByRole()` (stable). No bypass of the healing mechanism.
