# Implementation Plan: Clean Up Shopping Cart When a Logged-In Checkout Test Fails Mid-Way

## Objective

When `TestStandardComponentWithLogin.spec.ts` fails part-way (after adding products but before the
order is placed), the products stay in the **account's** server-side cart. The next run then adds new
products on top of the old ones, and `confirmOrder()` fails at
`expect(subTotal).toEqual(this.rawTotalPrice)` (`OrderTestFlow.ts:297`).

Fix: **after the test, if it did not complete normally, empty the shopping cart** of the logged-in
account. No check is added after login; the normal flow is unchanged.

---

## Scope

| Spec | Needs cleanup? | Why |
|---|---|---|
| `TestStandardComponentWithLogin.spec.ts` | **Yes** | Cart is stored on the account and persists across runs |
| `TestStandardComponent.spec.ts` (guest) | No | Guest cart lives in the browser context, which Playwright discards after each test |

---

## When Cleanup Runs

A `test.afterEach` hook in `TestStandardComponentWithLogin.spec.ts`, which runs when:

| Test outcome | `testInfo.status` | Cleanup? | Reason |
|---|---|---|---|
| Passed normally | `passed` | No | Order placed → cart already empty |
| Failed / timed out mid-way | `failed` / `timedOut` | **Yes** | Products left in cart |
| Skipped (no credentials) | `skipped` | No | Never logged in |
| Self-healed (`self-healed` annotation) | `passed` | **Yes** | `base.ts` stops the original run after healing ("remaining steps skipped"), so the products it added are still in the cart |
| Interrupted | `interrupted` | **Yes** | Run stopped mid-way |

The condition is intention-based (checks the actual outcome), not mismatch-based
(`status !== expectedStatus`), so it stays correct even if the test is later marked `test.fail()`:

```typescript
const status = testInfo.status
const needsCleanup =
    status === "failed" || status === "timedOut" || status === "interrupted" ||
    testInfo.annotations.some(a => a.type === "self-healed")
```

Playwright runs `afterEach` with the same `page` fixture (still logged in) before fixtures are torn down,
including after a test timeout.

Failure **before** login (e.g. in `verifyShoppingCart()`): the hook still runs, but on the guest cart. This is
harmless — the account cart is untouched because the guest cart is only merged into the account cart at login.
The cleanup does not throw on a guest session.

---

## Layer Flow

```
TestStandardComponentWithLogin.spec.ts
    └── test.afterEach  (only when needsCleanup)
            └── BaseFlow.clearShoppingCart()                 (NEW)
                    ├── navigateToShoppingCartPage()         (existing, BaseFlow → HeaderComponent)
                    ├── wait for URL /cart                   (NEW)
                    └── ShoppingCartPage.removeAllItems()    (NEW)
                            ├── CartItemRowComponent.selectRemove()   (NEW, per row)
                            └── click "Update shopping cart"          (NEW, page-level)
```

---

## Application Behavior (DOM confirmed)

Actual DOM from the live cart page (trimmed to the relevant parts):

```html
<form action="/cart" enctype="multipart/form-data" method="post">
    <table class="cart">
        <tbody>
            <tr class="cart-item-row">
                <td class="remove-from-cart">
                    <span class="td-title">Remove:</span>
                    <input type="checkbox" name="removefromcart" value="7119653">
                </td>
                <td class="product-picture">...</td>
                <td class="product"><a href="/141-inch-laptop" class="product-name">14.1-inch Laptop</a></td>
                <td class="unit-price nobr">... <span class="product-unit-price">1590.00</span></td>
                <td class="qty nobr">... <input name="itemquantity7119653" type="text" value="1" class="qty-input"></td>
                <td class="subtotal nobr end">... <span class="product-subtotal">1590.00</span></td>
            </tr>
        </tbody>
    </table>
    <div class="buttons">
        <div class="common-buttons">
            <input type="submit" name="updatecart" value="Update shopping cart" class="button-2 update-cart-button">
            <input type="submit" name="continueshopping" value="Continue shopping" class="button-2 continue-shopping-button">
        </div>
    </div>
    ... (coupon, gift card, estimate shipping, totals, TOS, #checkout)
</form>
```

Locator check against this DOM:

| Plan locator | DOM evidence | Result |
|---|---|---|
| Row root `.cart-item-row` (existing `CartItemRowComponent`) | `<tr class="cart-item-row">` | ✓ matches |
| `row.getByRole("checkbox")` | Only one `input[type="checkbox"]` per row (`removefromcart`); qty is a textbox | ✓ unique within row |
| `page.getByRole("button", { name: "Update shopping cart" })` | `<input type="submit" value="Update shopping cart">` → accessible name = value. Other submit buttons (`Continue shopping`, `Apply coupon`, `Add gift card`, `Estimate shipping`, `Checkout`) have different names | ✓ unique on page |

Behavior notes:
- Removal flow: tick `removefromcart` on every row → click **Update shopping cart** → the form posts
  to `/cart` and the page reloads without those rows. All rows are ticked first, then **one** click.
- The TOS check script is bound only to `#checkout`, so **Update shopping cart** never opens the TOS popup.
- Checkbox `value` (`7119653`) and qty input name (`itemquantity7119653`) are cart-item ids generated
  by the server — **not** used in any locator.
- Empty-cart state is verified through the existing header counter (`HeaderComponent.getCartQty()` → `0`),
  so no empty-cart page locator is needed.

---

## Changes

### 1. UPDATE — `models/components/cart/CartItemRowComponent.ts`

Add one action. Each row contains exactly one checkbox (Remove — confirmed in DOM), so
`getByRole("checkbox")` scoped to the row is stable and may act directly
(CLAUDE.md: `getByRole()` locators do not need `withHealing()`).

```typescript
public async selectRemove(): Promise<void> {
    await this.componentLocator.getByRole("checkbox").check()
}
```

### 2. UPDATE — `models/pages/ShoppingCartPage.ts`

Add the update button (page-level, outside any component) and one method that empties the cart.
`input[type="submit"]` exposes its `value` as the accessible name → `getByRole("button", { name })`.

```typescript
private readonly updateCartBtnName = "Update shopping cart"

public async removeAllItems(): Promise<void> {
    const rows = await this.cartItemRowCompList()
    if (rows.length === 0) return
    for (const row of rows) {
        await row.selectRemove()
    }
    await this.page.getByRole("button", { name: this.updateCartBtnName }).click()
}
```

### 3. UPDATE — `test-flows/BaseFlow.ts`

Add one flow method to `BaseFlow`, next to the existing `navigateToShoppingCartPage()`. Clearing the cart is a
generic cart operation (independent of computer type or order flow), and `BaseFlow` already has the
`(page, testInfo)` constructor the hook needs — no dummy arguments, no change to `OrderTestFlow`.
Every flow extending `BaseFlow` inherits it.

- **Wait for `/cart` before reading rows:** `cartItemRowCompList()` uses `locator.all()`, which does **not**
  auto-wait. Right after clicking the header link the browser may still be on the previous page, so `.all()`
  could return `[]`, `removeAllItems()` would exit early and the cart would stay dirty. The URL check works
  for both a filled and an empty cart (the Update button is absent on an empty cart, so it is not used as the anchor).
- **No extra wait after "Update shopping cart":** `expect.poll(getCartQty)` retries until the header shows `0`
  after the postback reload. `getCartQty()` reads `textContent()` directly (not via `withHealing()`), so
  a read during reload cannot trigger healing.
- Start/finish are logged via `LoggerManager.getLogger(this.testInfo)` (Winston) so a cleanup failure is
  distinguishable from the test failure in `logs/`.

Imports in `BaseFlow.ts` (project convention: `.js` suffix in TS imports):

```typescript
import { Page, TestInfo, expect } from "@playwright/test";
import ShoppingCartPage from "../models/pages/ShoppingCartPage.js";
import LoggerManager from "../utils/LoggerManager.js";
```

```typescript
public async clearShoppingCart(): Promise<void> {
    const logger = LoggerManager.getLogger(this.testInfo)
    logger.info("Cleanup: clearing shopping cart")
    await this.navigateToShoppingCartPage()
    await expect(this.page).toHaveURL(/\/cart$/)
    const shoppingCartPage: ShoppingCartPage = new ShoppingCartPage(this.page, this.testInfo)
    await shoppingCartPage.removeAllItems()
    await expect.poll(() => shoppingCartPage.headerComp().getCartQty()).toBe(0)
    logger.info("Cleanup: shopping cart is empty")
}
```

### 4. UPDATE — `tests/web/Day25/TestStandardComponentWithLogin.spec.ts`

Add an `afterEach` hook. A `BaseFlow` is created in the hook because the test body's instance is not
reachable from hooks; cleanup needs only `page` and `testInfo`.

```typescript
test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status
    const needsCleanup =
        status === "failed" || status === "timedOut" || status === "interrupted" ||
        testInfo.annotations.some(a => a.type === "self-healed")
    if (!needsCleanup) return

    await new BaseFlow(page, testInfo).clearShoppingCart()
});
```

New import in the spec: `BaseFlow` from `../../../test-flows/BaseFlow.js`.

No change to test steps, `OrderTestFlow`, `base.ts`, the healing pipeline, or the guest spec.

---

## Self-Healing Interaction

- The cleanup uses only `getByRole()` locators plus the existing `navigateToShoppingCartLink()`.
  Hooks are **not** wrapped by `withSelfHealingGuard` (only the test body is), so a failed assertion in
  the hook never triggers assertion healing.
- `navigateToShoppingCartLink()` goes through `withHealing()`; if the header link is broken during
  cleanup, ACTION healing may run. This is the same locator the test itself uses, so the behavior is
  consistent with the rest of the suite.
- If cleanup fails, Playwright reports it **in addition to** the original test error. The original
  failure is never hidden.

---

## Known Limitation (out of scope)

When healing succeeds, `HealingEngine` reruns the test in a child process **during** the original test
body — before this `afterEach` runs. If the child uses the same account (child rerun has
`parallelIndex = 0` → `LOGIN_EMAIL_0`), it starts with the original run's leftover products and can fail
the subtotal check, so the heal is reported as `FAILED`. Fixing this would mean cleaning the cart before
the rerun, which changes the healing pipeline (CLAUDE.md: approval required). Not included in this plan.

---

## Decisions

1. **DOM confirmed** — locators checked against the live cart page (see Application Behavior).
2. **Self-healed case:** cleanup **runs** when the test has the `self-healed` annotation (original run
   stopped mid-way after healing, so its products are still in the cart).
3. **Trigger:** `afterEach` on failure / timeout / self-healed only — no check added after login.

---

## Verification

1. Typecheck: `yarn tsc --noEmit` → no errors.
2. Leave products in the account cart (e.g. temporarily force a failure locally right after
   `verifyShoppingCart()`, or add items manually while logged in).
3. Run: `yarn playwright test tests/web/Day25/TestStandardComponentWithLogin.spec.ts --project="Desktop Chromium" --config=playwright.config.web.js`
   → confirm the hook runs and the header cart count ends at `(0)`.
4. Run the spec again → it must pass `confirmOrder()` (no leftover items).
5. Timeout case: temporarily set a low `test.setTimeout()` so the test times out after products are added
   → confirm the hook still runs with the same `page` and the header cart count ends at `(0)`.
6. Run a passing test → confirm the hook is skipped (no extra navigation).
7. Self-healed case: covered by the same condition; verified by code review (forcing a real heal
   would call OpenAI and patch source).
8. Revert the temporary forced failure (step 2) and timeout (step 5) before commit.

---

## Review Responses (OpenAI review)

| Finding | Decision | Reason |
|---|---|---|
| [HIGH] `getByRole().click()` in page bypasses `withHealing()` | Not applied | CLAUDE.md requires `withHealing()` only for CSS/XPath; `getByRole()` may click directly. Precedent in the same file: `ShoppingCartPage.closeTosWarningDialog()`. The button sits outside any component, so it belongs in the page. |
| [HIGH] `OrderTestFlow` constructor in hook may break | Not applied | Constructor only assigns fields and creates a logger; `clearShoppingCart()` uses none of the checkout state. A new flow would duplicate an existing one. *(Superseded in round 3: cleanup moved to `BaseFlow`.)* |
| [MEDIUM] Missing post-login wait in `selectTOSandCheckoutWithLogin` | Not applied | Out of scope (existing code, untouched by this plan); it already waits via `expect.poll(isLogoutVisible)`. Handle separately if flakiness is observed. |
| [MEDIUM] `needsCleanup` is mismatch-based | **Applied** | Condition now checks `failed` / `timedOut` / `interrupted` + `self-healed` directly. |
| [LOW] `Promise<Number>` in `getProductSubTotal()` | Not applied | Pre-existing; CLAUDE.md forbids refactoring surrounding code. Separate PR. |
| [LOW] Other logged-in specs may share cart contamination | Not applied | The only other login spec, `tests/web/Login.spec.ts`, never adds items to the cart. |
| Validation: typecheck | **Applied** | Added `yarn tsc --noEmit` as Verification step 1. |

### Round 2

| Finding | Decision | Reason |
|---|---|---|
| [HIGH] Missing wait after login in `selectTOSandCheckoutWithLogin` | Not applied | Same as round 1. Playwright locators are lazy (re-resolved + auto-waited on every action), so there is no stale page-object risk; code is out of scope and already waits via `expect.poll(isLogoutVisible)`. |
| [HIGH] `afterEach` not present in spec | Not applicable | Plan is not implemented yet — the hook is added in Changes #4. Not a plan defect. |
| [MEDIUM] `selectRemove()` / `removeAllItems()` / `clearShoppingCart()` missing | Not applicable | Plan is not implemented yet — methods are added in Changes #1–#3. Not a plan defect. |
| [MEDIUM] `testInfo.status!` typing | **Applied** (readability) | No compile issue (`status?: "passed"\|"failed"\|"timedOut"\|"skipped"\|"interrupted"`), but explicit comparisons drop the non-null assertion. |
| [LOW] Log cleanup start/result | **Applied** | Two `logger.info` lines in `clearShoppingCart()` (logger from `LoggerManager` since round 3). |
| Validation: `yarn lint` | Not applied | No lint script in `package.json`. |
| Validation: timeout path | **Applied** | Added Verification step 5. |

### Round 3

| Finding | Decision | Reason |
|---|---|---|
| [HIGH] `afterEach` not present in spec | Not applicable | Plan is not implemented yet (raised in round 2 as well). |
| [HIGH] Auth/session drift — pre-check login and throw | Not applied (documented) | Throwing would create a false failure when the test fails **before** login; cleanup on the guest cart is harmless (guest cart merges into the account only at login). Session expiry within a few-minute test is not realistic. Case documented in "When Cleanup Runs". |
| [MEDIUM] Missing wait after "Update shopping cart" | **Applied, at the correct point** | After Update, `expect.poll(getCartQty)` already retries through the reload. The real race is **before** reading rows: `cartItemRowCompList()` uses non-waiting `.all()`. Added `expect(this.page).toHaveURL(/\/cart$/)` after navigation. |
| [MEDIUM] Spec uses raw `page.goto()` | Not applied | Pre-existing, out of scope. The hook adds no raw Playwright interaction — it only calls a flow. |
| [LOW] Hook constructs `OrderTestFlow` with unused data | **Applied (redesigned)** | `clearShoppingCart()` moved to `BaseFlow`, whose existing `(page, testInfo)` constructor needs no dummy args. Constructor overloads / static factory on `OrderTestFlow` rejected: overloads make `computerComponentClass` optional and break existing usages; a factory still needs a concrete computer component class. |
| [LOW] Skipped test must not run cleanup | No change needed | `skipped` is already excluded by `needsCleanup`. |
| Validation: no secrets in logs | No change needed | Cleanup logs contain only fixed messages. |

### Round 4

| Finding | Decision | Reason |
|---|---|---|
| [HIGH] Wrap cleanup in `try/catch`, log and return | Not applied | Swallowing the error leaves a dirty cart silently — the next run then fails at `confirmOrder()` with a misleading subtotal error, which is the exact problem this plan fixes. The original error is not masked: Playwright reports the test error first and appends the hook error (`testInfo.errors`). |
| [MEDIUM] Wait after "Update shopping cart" | Not applied | Same as round 3. The suggested `toHaveURL(/\/cart/)` would pass immediately because the form posts back to `/cart` itself; `expect.poll(getCartQty)` is the real synchronization point. |
| [MEDIUM] Compile-safe imports/signatures | **Applied (documented)** | Exact `.js` import paths added to Changes #3; `yarn tsc --noEmit` already Verification step 1. |
| [LOW] Extract `shouldCleanup()` helper | Not applied | Condition is used once — no repetition to remove. |
| [LOW] Log when cleanup is skipped | Not applied | No diagnostic value: passing runs need none, skipped runs already show the skip reason in the report. Adds noise to every passing run. |

---

## Relevant Files

- `models/components/cart/CartItemRowComponent.ts`
- `models/pages/ShoppingCartPage.ts`
- `test-flows/BaseFlow.ts`
- `tests/web/Day25/TestStandardComponentWithLogin.spec.ts`
- `tests/fixtures/base.ts` (reference: `self-healed` annotation, hooks not wrapped)
