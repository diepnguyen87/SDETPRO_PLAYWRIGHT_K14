# REQ-001: Remove One or Multiple Items from the Shopping Cart

## Metadata
- ID: REQ-001
- Area: cart
- Source: Copilot
- Author: Copilot

## Goal
The user can remove one or multiple products from the shopping cart before checkout, following the Build Your Own Computer flow used in TestStandardComponent.spec.ts.

## Scope
### In Scope
- Add one or multiple configured Build Your Own Computer products to the shopping cart using StandardComputer test data.
- Open the Shopping Cart page using the cart link in the header.
- Select the checkbox in the Remove column for one or multiple cart item rows.
- Click Update shopping cart to apply the changes.
- Update the product list, total amount, and cart quantity after removal.
- Remove all products when Remove is selected for every existing cart item row.

### Out of Scope
- Change product quantity.
- Add or update discount codes.
- Add products through other flows.
- Complete checkout after removing products.

## Preconditions
- The Tricentis Demo Web Shop environment is available.
- The user is on `/build-your-own-computer`.
- The shopping cart does not contain old data, or it has been cleared before the test starts.
- The user is logged in or acts as a guest without affecting the cart-removal flow.
- Product data is sourced from `test-data/sit/StandardComputer.json`.

## Actors
- Guest or authenticated user.
- Demo Web Shop system.

## User Flow
1. The user opens `/build-your-own-computer`.
2. The user configures a Build Your Own Computer using the StandardComputer data list.
3. The user clicks Add to cart for each configuration that must be added.
4. The user opens the Shopping Cart using the cart link in the header.
5. The system displays the cart item rows at `/cart`.
6. The user selects the checkbox in the Remove column for one or multiple rows to be removed.
7. The user clicks `Update shopping cart`.
8. The system removes the selected rows and updates the shopping cart.

## Acceptance Criteria
- [ ] AC1: When the checkbox in the Remove column is selected for only one cart item row, that row disappears from the Shopping Cart after clicking Update shopping cart.
- [ ] AC2: Cart item rows not selected for removal remain in the cart and keep their product information, quantity, Price, and Total unchanged.
- [ ] AC3: When the Remove checkbox is selected for multiple rows, all selected rows disappear after clicking Update shopping cart.
- [ ] AC4: The cart quantity displayed in the header reflects the number of products remaining after removal.
- [ ] AC5: The total amount is recalculated correctly after removing one or multiple rows.
- [ ] AC6: When Remove is selected for every row, the shopping cart is displayed in its empty state.
- [ ] AC7: The header displays `Shopping cart (0)` when the shopping cart is empty.
- [ ] AC8: The updated page does not display any removed cart item row or removed amount.
- [ ] AC9: The removal operation is represented only by the Remove checkbox column; there is no separate Remove button on each row.

## Expected Results
- The Shopping Cart URL remains `/cart` or navigates back to `/cart` after the update.
- The selected cart item rows no longer appear in the Product(s) column.
- The header quantity is updated immediately after removal.
- The header displays `Shopping cart (0)` when every item is removed.
- The Order Subtotal and total payment are recalculated based on the remaining products.
- When the cart is empty, no cart item rows are displayed.
- When the cart is empty, the page displays the text `Your Shopping Cart is empty!`.
- When the cart is empty, the cart item table and Update shopping cart button are not displayed.

## Error Cases
- E1: When the user selects the Remove checkbox but does not click Update shopping cart, the removal must not be applied and the cart item rows must remain visible.
- E2: When the shopping cart contains no products, the system does not expose a valid Remove action and keeps the empty-cart state.
- E3: When a removal operation fails, the system must not display an incorrect header quantity or total amount.

## Test Data
- One-product happy path: add one Build Your Own Computer configuration, verify the cart contains the expected row, then select Remove for that single row and update the cart.
- Multiple-product happy path: add at least two different Build Your Own Computer configurations, verify all rows are displayed, then select Remove for one row and verify the remaining row is preserved.
- Multiple-row removal happy path: add at least three different Build Your Own Computer configurations, verify all rows are displayed, then select Remove for at least two rows and update the cart.
- Empty-cart happy path: add one or multiple Build Your Own Computer configurations, then remove all displayed cart item rows.
- Verification data: record each remaining item's name, quantity, Price, Total, and the resulting Order Subtotal before removal.

## Notes
- Removal is a two-step behavior: select the Remove option for the intended rows, then update the shopping cart to apply the removal.
- When the empty-cart state is verified, the cart item list, cart table, and Update shopping cart action must no longer be available.
- Removal must update the cart quantity and totals consistently before and after the user navigates away from the page.
- `TestStandardComponent.spec.ts` is the reference for the product-build and Shopping Cart navigation flow.
