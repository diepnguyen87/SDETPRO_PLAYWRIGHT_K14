# Implementation Plan: Remove One or Multiple Items from the Shopping Cart

Status: Draft
Requirement: requirements/REQ-001-remove-cart-items.md

## Objective

Add a guest-cart removal spec in `tests/web/Day25/` that builds Build Your Own Computer configurations from `testData.standardComputer`, opens the cart from the header, removes one, several or all rows through the Remove checkbox + **Update shopping cart**, and verifies the remaining rows, header quantity, totals and the empty-cart state. The change reuses the existing build/cart flow in `OrderTestFlow` and the existing `ShoppingCartPage` / `CartItemRowComponent`, adding only the missing cart-removal steps and read methods.

## Acceptance Criteria Traceability

| ID | Covered by (spec › flow step) | Assertion |
|---|---|---|
| AC1 | `Remove single item from cart` and `Remove one of two items from cart` › `OrderTestFlow.removeCartItemsAndVerify([0])` | `expect(shoppingCartPage.cartItemRows()).toHaveCount(before - 1)` |
| AC2 | `Remove one of two items from cart`, `Remove multiple items from cart` › `OrderTestFlow.removeCartItemsAndVerify()` | `expect(afterSnapshots).toEqual(remainingSnapshots)` (product name, attributes, unit price, quantity, row total) |
| AC3 | `Remove multiple items from cart` › `OrderTestFlow.removeCartItemsAndVerify([0, 1])` | `expect(shoppingCartPage.cartItemRows()).toHaveCount(1)` |
| AC4 | `Remove one of two items from cart`, `Remove multiple items from cart` › `OrderTestFlow.removeCartItemsAndVerify()` | `expect.poll(() => headerComp().getCartQty()).toBe(sum of remaining quantities)` |
| AC5 | `Remove one of two items from cart`, `Remove multiple items from cart` › `OrderTestFlow.removeCartItemsAndVerify()` | `expect(subTotal).toBeCloseTo(sum of remaining row totals, 2)` and `expect(subTotal + shipping + tax).toBeCloseTo(total, 2)` |
| AC6 | `Remove single item from cart`, `Keep items when Update is not clicked, then remove all` › `OrderTestFlow.verifyEmptyShoppingCart()` | `expect(await shoppingCartPage.getEmptyCartMessage()).toEqual(shoppingCartData.emptyCartMessage)`; `expect(cartItemRows()).toHaveCount(0)`; `expect(updateCartBtn()).toBeHidden()` |
| AC7 | `Remove single item from cart`, `Keep items when Update is not clicked, then remove all` › `OrderTestFlow.verifyEmptyShoppingCart()` | `expect.poll(() => headerComp().getShoppingCartLinkText()).toEqual(shoppingCartData.emptyCartHeaderText)` (`Shopping cart (0)`) |
| AC8 | `Remove one of two items from cart`, `Remove multiple items from cart` › `OrderTestFlow.removeCartItemsAndVerify()` | `expect(afterAttributes).not.toContain(removedAttributes)` per removed row; removed row total excluded from Sub-Total (AC5 check) |
| AC9 | `Remove one of two items from cart` › `OrderTestFlow.removeCartItemsAndVerify()` | `expect(await row.hasRemoveButton()).toBe(false)` for every remaining row |
| E1 | `Keep items when Update is not clicked, then remove all` › `OrderTestFlow.selectRemoveWithoutUpdateAndVerify([0])` | `expect.poll(() => row.isRemoveSelected()).toBe(false)` after reopening the cart; `expect(cartItemRows()).toHaveCount(2)`; snapshots unchanged; header quantity unchanged |
| E2 | `Remove single item from cart`, `Keep items when Update is not clicked, then remove all` › `OrderTestFlow.verifyEmptyShoppingCart()` | `expect(cartItemRows()).toHaveCount(0)` (no Remove checkbox) and `expect(updateCartBtn()).toBeHidden()` |
| E3 | `Cart stays unchanged when the update request fails` › `OrderTestFlow.removeCartItemsWithFailedUpdateAndVerify([0])` | after reopening the cart: `expect(cartItemRows()).toHaveCount(before)`; snapshots unchanged; `expect.poll(getCartQty).toBe(before)`; Sub-Total unchanged |

## Scenarios

All tests run as guest: each test gets a fresh browser context, so the cart starts empty (requirement precondition). Each test starts with `page.goto("/build-your-own-computer")`, creates `OrderTestFlow(page, StandardComputerComponent, undefined, <data subset>, testInfo)`, calls `buildComputerDetailListAndAddToCart()` (which already asserts the header quantity grows by 1 per add) and `navigateToShoppingCartPage()`. Tag: `TAG.regression`.

1. `${TAG.regression} | Remove single item from cart` — data `standardComputer.slice(0, 1)`
   - `removeCartItemsAndVerify([0])` → row disappears, flow calls `verifyEmptyShoppingCart()`: empty message shown, no rows, no Update button, header `(0)`.
2. `${TAG.regression} | Remove one of two items from cart` — data `standardComputer.slice(0, 2)`
   - `removeCartItemsAndVerify([0])` → 1 row left, equal to the second row's snapshot; removed attributes absent; header = remaining quantity; Sub-Total = remaining row total; Sub-Total + Shipping + Tax = Total; no Remove button in the row.
3. `${TAG.regression} | Remove multiple items from cart` — data `standardComputer` (3 entries)
   - `removeCartItemsAndVerify([0, 1])` → 1 row left (third configuration) with the same checks as scenario 2.
4. `${TAG.regression} | Keep items when Update is not clicked, then remove all` — data `standardComputer.slice(0, 2)`
   - `selectRemoveWithoutUpdateAndVerify([0])` → reopen the cart from the header; checkbox is unchecked, both rows and header quantity unchanged (E1).
   - `removeCartItemsAndVerify([0, 1])` → empty-cart state (AC6, AC7, E2).
5. `${TAG.regression} | Cart stays unchanged when the update request fails` — data `standardComputer.slice(0, 2)`
   - `removeCartItemsWithFailedUpdateAndVerify([0])` → the next Update request is aborted, the cart is reopened from the header; both rows, header quantity and Sub-Total are unchanged (E3).

## Reuse

- `tests/fixtures/base.ts` — `test` (self-healing guard).
- `constant/Tag.ts` — `TAG.regression`.
- `test-data/TestDataProvider.ts` — `testData.standardComputer` (`test-data/sit/StandardComputer.json`, 3 entries; subsets via `slice()` in the spec).
- `models/components/computer/StandardComputerComponent.ts` — passed to `OrderTestFlow`.
- `test-flows/computer/OrderTestFlow.ts` — constructor, `buildComputerDetailListAndAddToCart()`.
- `test-flows/BaseFlow.ts` — `navigateToShoppingCartPage()`.
- `models/pages/ShoppingCartPage.ts` — `cartItemRowCompList()`, `totalComp()`, `headerComp()` (from `BasePage`), `updateCartBtnName`.
- `models/components/cart/CartItemRowComponent.ts` — `selectRemove()`, `getProductUnitPrice()`, `getQuantity()`, `getProductSubTotal()`.
- `models/components/cart/TotalComponent.ts` — `priceCategories()` (`Sub-Total:`, `Shipping:`, `Tax:`, `Total:`).
- `models/components/global/header/HeaderComponent.ts` — `getCartQty()`.
- `config/pages.json` — `/cart` → `ShoppingCartPage` already registered (needed by `ensureLoaded()`).

## Changes by Layer

### Spec
- `tests/web/Day25/TestRemoveCartItems.spec.ts` (new) — the five scenarios above. Imports `test` from `../../fixtures/base.js`, `TAG`, `testData`, `StandardComputerComponent`, `OrderTestFlow`. Only `page.goto()` and flow calls; assertions live in the flow steps, matching `TestStandardComponent.spec.ts`.

### TestFlow
`test-flows/computer/OrderTestFlow.ts` (extend; it already owns build + cart steps):
- Private type `CartItemSnapshot = { name: string; attributes: string; unitPrice: number; quantity: number; subTotal: number }` and private `snapshotCartItems(rows: CartItemRowComponent[]): Promise<CartItemSnapshot[]>`.
- `public async removeCartItemsAndVerify(rowIndexes: number[]): Promise<void>` — snapshot rows, `selectRemove()` on each index, `shoppingCartPage.clickOnUpdateCartBtn()`, `expect(cartItemRows()).toHaveCount(remaining)` (synchronises with the postback reload, since the URL stays `/cart`). If no rows remain → `verifyEmptyShoppingCart()`. Otherwise: compare remaining snapshots (AC2), removed attributes absent (AC8), `hasRemoveButton()` false per row (AC9), `expect.poll(getCartQty)` = sum of remaining quantities (AC4), `priceCategories()` Sub-Total = sum of remaining row totals and Sub-Total + Shipping + Tax = Total via `toBeCloseTo(…, 2)` (AC5).
- `public async selectRemoveWithoutUpdateAndVerify(rowIndexes: number[]): Promise<void>` — snapshot + header quantity, `selectRemove()` on each index, `navigateToShoppingCartPage()`, `expect.poll(() => rows[i].isRemoveSelected()).toBe(false)` (reload done, selection discarded), row count, snapshots and header quantity unchanged (E1).
- `public async verifyEmptyShoppingCart(): Promise<void>` — empty message equals `testData.shoppingCart.emptyCartMessage`, `cartItemRows()` count 0, `updateCartBtn()` hidden, `expect.poll(getShoppingCartLinkText).toEqual(testData.shoppingCart.emptyCartHeaderText)` (AC6, AC7, E2).
- `public async removeCartItemsWithFailedUpdateAndVerify(rowIndexes: number[]): Promise<void>` — snapshot rows, header quantity and Sub-Total; `selectRemove()` on each index; `shoppingCartPage.failNextUpdateCartRequest()`; `clickOnUpdateCartBtn()`; `shoppingCartPage.returnToCartAfterFailedUpdate()`; `navigateToShoppingCartPage()` (fresh server state); row count, snapshots, header quantity and Sub-Total unchanged (E3). No raw Playwright API in the flow — interception lives in the page.

### Page Object
`models/pages/ShoppingCartPage.ts`:
- `private readonly emptyCartMessageSel = ".order-summary-content"` (confirmed on the live empty `/cart`: element text `Your Shopping Cart is empty!`).
- `public cartItemRows(): Locator` → `this.page.locator(CartItemRowComponent.selectorValue)` (assertion only, no interaction).
- `public updateCartBtn(): Locator` → `this.page.getByRole("button", { name: this.updateCartBtnName })`.
- `public async clickOnUpdateCartBtn(): Promise<void>` → `await this.updateCartBtn().click()`; `removeAllItems()` calls it instead of its inline locator (same behaviour).
- `public async getEmptyCartMessage(): Promise<string>` → `(await this.withHealing(this.emptyCartMessageSel, l => l.innerText())).trim()`.
- `private readonly updateCartRequestUrl = "**/cart"` (the cart form posts to `/cart`: `<form action="/cart" method="post">` in `artifacts/**/dom.html`).
- `public async failNextUpdateCartRequest(): Promise<void>` → `this.page.route(this.updateCartRequestUrl, route => route.request().method() === "POST" ? route.abort("failed") : route.fallback(), { times: 1 })` — simulates the removal failure for E3 (human decision Q3: interception is allowed, encapsulated in the page).
- `public async returnToCartAfterFailedUpdate(): Promise<void>` → `this.page.unroute(this.updateCartRequestUrl)`, `this.page.goBack()`, then `ensureLoaded()` — leaves the browser error page so the header is available again.
- New async public methods call `await this.ensureLoaded()` first (page reached by the header link), except `failNextUpdateCartRequest()` which only arms the route. Existing methods are left unchanged.

### Component
`models/components/cart/CartItemRowComponent.ts`:
- `private productNameSel = ".product-name"`, `private attributesSel = ".attributes"` (from `artifacts/**/dom.html`: `<a class="product-name">`, `<div class="attributes">`). All rows share the name `Build your own computer`, so `attributes` is what identifies a row.
- `private removeBtnName = /remove/i`.
- `public async getProductName(): Promise<string>` and `public async getAttributes(): Promise<string>` — `withHealing(sel, l => l.innerText())`, trimmed.
- `public async isRemoveSelected(): Promise<boolean>` → `this.componentLocator.getByRole("checkbox").isChecked()`.
- `public async hasRemoveButton(): Promise<boolean>` → `(await this.componentLocator.getByRole("button", { name: this.removeBtnName }).count()) > 0`.

`models/components/global/header/HeaderComponent.ts`:
- `public async getShoppingCartLinkText(): Promise<string>` → `withHealing(this.shoppingCartLinkSel, l => l.innerText())` with whitespace collapsed (`.replace(/\s+/g, " ").trim()`), reusing the existing `shoppingCartLinkSel` (AC7).

### Test Data
- `test-data/sit/cart/ShoppingCartData.json` (new) — `{ "emptyCartMessage": "Your Shopping Cart is empty!", "emptyCartHeaderText": "Shopping cart (0)" }`.
- `test-data/TestDataProvider.ts` — import `sitShoppingCart` and register it as `shoppingCart` in `sitData` (UAT stays `undefined`).

### Config
- None (`/cart` already in `config/pages.json`).

## Out of Scope

- Changing quantity, discount codes, other add-to-cart flows, checkout after removal (per requirement).
- Logged-in removal (requirement allows guest; the account cart would need `clearShoppingCart()` cleanup).
- Refactoring `cartItemRowCompList()`, `verifyShoppingCart()` or the `waitForTimeout()` calls in `buildComputerDetailAndAddToCart()`.

## Risks

- `cartItemRowCompList()` uses `locator.all()`, which does not auto-wait; new methods call `ensureLoaded()` first and the flow waits with `toHaveCount()` after Update, before reading rows again.
- Row components from `.all()` are `nth()` locators; after the postback they point to the new DOM order, so the flow re-reads the row list after Update instead of reusing the old components.
- Each scenario builds 1–3 computers (≈1 s fixed wait per build in the existing flow), so the spec adds runtime; tagged `@Regression`, not `@Smoke`.
- E3: an aborted form POST leaves the browser on an error page; whether `clickOnUpdateCartBtn()` resolves or throws on the aborted navigation must be confirmed when implementing (`returnToCartAfterFailedUpdate()` absorbs it with `goBack()`).
- `getShoppingCartLinkText()` depends on the rendered whitespace between `Shopping cart` and `(0)`; it is normalised before comparing.
- Floating-point sums of prices use `toBeCloseTo(…, 2)` rather than `toEqual`.
- Assertions on `cartItemRows()` / `updateCartBtn()` locators do not go through `withHealing()`; a failure there routes to assertion healing in `base.ts`, as for other web-first assertions.

## Open Questions

- Q1: Should the removal steps live in `OrderTestFlow` (planned, it already owns build + cart verification) or in a new `CartTestFlow`? A new flow would need the build steps moved or duplicated.
  → A: Keep the removal steps in `OrderTestFlow`.
- Q2: Tag for the new spec — `TAG.regression` (planned) or `TAG.smoke`?
  → A: `TAG.regression`.
- Q3: E3 is planned as Not automated. Is request interception acceptable in a flow for this case, or does it stay manual?
  → A: Request interception is accepted so that E3 is automated.
- Q4: AC4 asserts the numeric header quantity via `getCartQty()`; is that enough for AC7, or should the exact header text `Shopping cart (0)` be asserted (would need a new header read method)?
  → A: Assert the exact header text `Shopping cart (0)` (as written in the requirement).

## Verification

1. `yarn tsc --noEmit` → 0 errors.
2. `yarn playwright test --list --config=playwright.config.web.js` → the five new tests are listed and test data loads.
3. `yarn playwright test tests/web/Day25/TestRemoveCartItems.spec.ts --config=playwright.config.web.js` (Desktop Chromium) → 5 passed.
4. Regression on touched code: `yarn playwright test tests/web/Day25/TestStandardComponent.spec.ts tests/web/Day25/TestComponentWithLogin.spec.ts --config=playwright.config.web.js` → pass (uses `verifyShoppingCart()` and `removeAllItems()` / `clearShoppingCart()`).

## Review Resolution

## Relevant Files

- requirements/REQ-001-remove-cart-items.md
- tests/web/Day25/TestStandardComponent.spec.ts
- tests/web/Day25/TestComponentWithLogin.spec.ts
- tests/web/Day25/TestRemoveCartItems.spec.ts (new)
- tests/fixtures/base.ts
- constant/Tag.ts
- test-flows/BaseFlow.ts
- test-flows/computer/OrderTestFlow.ts
- models/pages/BasePage.ts
- models/pages/ShoppingCartPage.ts
- models/components/cart/CartItemRowComponent.ts
- models/components/cart/TotalComponent.ts
- models/components/global/header/HeaderComponent.ts
- config/pages.json
- test-data/TestDataProvider.ts
- test-data/sit/StandardComputer.json
- test-data/sit/cart/ShoppingCartData.json (new)
