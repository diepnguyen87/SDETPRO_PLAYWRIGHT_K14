# REQ-002: Complete Checkout Using Check / Money Order

## Metadata
- ID: REQ-002
- Area: checkout
- Source: Copilot
- Author: Copilot

## Goal
Ensure a shopper can complete a guest checkout using Check / Money Order and that the completed order records the selected payment method.

## Scope
### In Scope
- Add configured Build Your Own Computer products to the shopping cart.
- Complete checkout as a guest with the Check / Money Order payment method.
- Verify successful order completion and the payment method on the order details.

### Out of Scope
- Checkout using Credit Card, Cash On Delivery, or Purchase Order.
- Checkout while logged in.
- Changes to the product configuration or payment options.

## Preconditions
- The Demo Web Shop environment is available.
- The shopping cart is empty or cleared before the scenario begins.
- Standard Computer product data is available for configuring products.
- The shopper can complete checkout as a guest.

## Actors
- Guest shopper.
- Demo Web Shop system.

## User Flow
1. The shopper configures one or more Build Your Own Computer products and adds them to the shopping cart.
2. The shopper opens the shopping cart and proceeds to checkout as a guest.
3. The shopper provides the required billing and shipping information and selects a shipping method.
4. The shopper selects Check / Money Order as the payment method and continues without entering credit card information.
5. The shopper reviews and confirms the order.
6. The shopper opens the completed order details.

## Acceptance Criteria
- [ ] AC1: The shopper can proceed from the shopping cart to guest checkout with the configured products.
- [ ] AC2: The shopper can select Check / Money Order and continue to order review without entering credit card information.
- [ ] AC3: The order review displays totals consistent with the product subtotal, shipping, tax, and any payment-method fee.
- [ ] AC4: Confirming the order displays a successful order-completion result and an order number.
- [ ] AC5: The completed order details identify the payment method as Check / Money Order.

## Expected Results
- Checkout completes successfully using Check / Money Order.
- The order completion page displays the order number and a link to the order details.
- The order details show Check / Money Order as the payment method.

## Error Cases
- None

## Test Data
- Standard Computer product data for one or more configured products.
- Guest billing and shipping data supported by the test environment.

## Notes
- This requirement covers the Check / Money Order checkout path only; other payment methods are outside scope.
