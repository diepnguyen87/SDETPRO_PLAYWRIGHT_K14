# Bug Audit: TestStandardComponentWithLogin

## Objective

Audit and fix bugs found in `TestStandardComponentWithLogin.spec.ts` and its full execution path.
The test exercises a logged-in checkout flow where login happens mid-flow on `CheckoutAsGuestPage`.

---

## Checkout Flow Reference

| Step | Guest (existing) | With Login |
|---|---|---|
| Navigate | `/build-your-own-computer` | `/build-your-own-computer` |
| Build & add to cart | same | same |
| Verify cart | same | same |
| TOS + Click Checkout | → CheckoutAsGuestPage | → CheckoutAsGuestPage |
| Guest/Login choice | Click "Checkout as Guest" | Fill credentials → click Login |
| Post-login redirect | — | → back to ShoppingCartPage |
| TOS + Click Checkout again | — | → `/checkout/onepagecheckout` |
| Billing address | same | same (already handles saved-address dropdown) |
| Remaining checkout | same | same |

---

## Layer Flow

```
TestStandardComponentWithLogin.spec.ts
    └── OrderTestFlow
            ├── buildComputerDetailListAndAddToCart  → ComputerDetailPage → StandardComputerComponent
            ├── navigateToShoppingCartPage           → BaseFlow → HeaderComponent
            ├── verifyShoppingCart                   → ShoppingCartPage → CartItemRowComponent, TotalComponent
            ├── selectTOSandCheckoutWithLogin        → ShoppingCartPage → CheckoutAsGuestPage → LoginComponent
            ├── inputBillingAddressOrUseSaved        → CheckoutPage → BillingAddressComponent
            ├── inputShippingAddress                 → CheckoutPage → ShippingAddressComponent
            ├── selectShippingMethod                 → CheckoutPage → ShippingMethodComponent
            ├── selectPaymentMethod                  → CheckoutPage → PaymentMethodComponent
            ├── inputPaymentInfo                     → CheckoutPage → PaymentInformationComponent
            ├── confirmOrder                         → CheckoutPage → ConfirmOrderComponent
            └── checkoutCompleted                    → CheckoutPage → CompletedComponent
```

---

## Bugs Found

### Bug 1 — CRITICAL: LoginComponent.clickLoginBtn() — navigation wait commented out

**File:** `models/components/LoginComponent.ts`, line 25

**Problem:**
The navigation wait is commented out:
```typescript
// await this.componentLocator.waitFor({ state: 'hidden' });
```
After clicking "Log in", the method returns immediately without confirming that the login
page has disappeared and navigation has started.

In `selectTOSandCheckoutWithLogin`, this is currently compensated by:
```typescript
await expect.poll(() => shoppingCartPage.headerComp().isLogoutVisible()).toBe(true);
```
However, `clickLoginBtn()` is also used in `LoginTestFlow` and other contexts where no such
safety net exists — making the missing wait a latent bug outside this flow.

**Fix:** Uncomment the wait so `clickLoginBtn()` is self-contained and safe in all callers:
```typescript
public async clickLoginBtn(): Promise<void> {
    await this.componentLocator.getByRole('button', { name: 'Log in' }).click();
    await this.componentLocator.waitFor({ state: 'hidden' });
}
```

---

### Bug 2 — HIGH: CartItemRowComponent does not extend Component

**File:** `models/components/cart/CartItemRowComponent.ts`

**Problem:**
- Does not extend `Component` — no self-healing capability
- Constructor signature: `(component: Locator)` — incompatible with CLAUDE.md standard
  `(page, componentLocator, testInfo)`
- `ShoppingCartPage.cartItemRowCompList()` instantiates it with only one argument

CLAUDE.md: "All components must extend `Component` and use the `@selector("...")` decorator."

**Fix:** Extend Component and update both the component and its instantiation in the page:

```typescript
// CartItemRowComponent.ts
@selector(".cart-item-row")
export default class CartItemRowComponent extends Component {
    private productUnitPriceSel = ".product-unit-price"
    private qualityInputSel = ".qty-input"
    private productSubTotalSel = ".product-subtotal"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async getProductUnitPrice(): Promise<number> {
        return Number(await this.componentLocator.locator(this.productUnitPriceSel).textContent())
    }

    public qualityInput(): Locator {
        return this.componentLocator.locator(this.qualityInputSel)
    }

    public async getProductSubTotal(): Promise<number> {
        return Number(await this.componentLocator.locator(this.productSubTotalSel).textContent())
    }
}
```

```typescript
// ShoppingCartPage.ts — update cartItemRowCompList()
public async cartItemRowCompList(): Promise<CartItemRowComponent[]> {
    const locators = await this.page.locator(CartItemRowComponent.selectorValue).all()
    return locators.map(loc => new CartItemRowComponent(this.page, loc, this.testInfo))
}
```

---

## Fix Priority

| # | Bug | Severity | File(s) | Status |
|---|-----|----------|---------|--------|
| 1 | Uncomment navigation wait in `clickLoginBtn()` | CRITICAL | `models/components/LoginComponent.ts` | ✓ Fixed |
| 2 | Extend `Component` in `CartItemRowComponent` | HIGH | `models/components/cart/CartItemRowComponent.ts` + `models/pages/ShoppingCartPage.ts` | ✓ Fixed |

---

## Relevant Files

- `models/components/LoginComponent.ts`
- `models/components/cart/CartItemRowComponent.ts`
- `models/pages/ShoppingCartPage.ts`
- `test-flows/computer/OrderTestFlow.ts`
- `tests/web/Day25/TestStandardComponentWithLogin.spec.ts`
