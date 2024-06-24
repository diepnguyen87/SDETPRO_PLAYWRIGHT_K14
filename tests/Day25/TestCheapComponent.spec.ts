import { test } from "@playwright/test";
import paymentMethods from "../../constant/PaymentMethod.js";
import TAG from "../../constant/Tag.js";
import CheapComputerComponent from "../../models/components/computer/CheapComputerComponent.js";
import cheapComputerDataList from "../../test-data/CheapComputer.json" assert { type: "json" };
import OrderTestFlow from "../../test-flows/computer/OrderTestFlow.js";
import { getCreditCardNumber } from "../../utils/GetCreditCardNumber.js";

test(`${TAG.smoke} | Test Cheap Component`, async ({ page }) => {
    await page.goto("/build-your-cheap-own-computer")
    const orderTestFlow: OrderTestFlow = new OrderTestFlow(page, CheapComputerComponent, undefined, cheapComputerDataList)
    await orderTestFlow.buildComputerDetailListAndAddToCart()
    await orderTestFlow.navigateToShoppingCartPage()
    await orderTestFlow.verifyShoppingCart()
    await orderTestFlow.selectTOSandCheckout()
    await orderTestFlow.inputBillingAddress()
    await orderTestFlow.inputShippingAddress()
    await orderTestFlow.selectShippingMethod()
    await orderTestFlow.selectPaymentMethod(paymentMethods.creditCard)
    await orderTestFlow.inputPaymentInfo(await getCreditCardNumber('Mastercard'))
    await orderTestFlow.confirmOrder()
    await orderTestFlow.checkoutCompleted()

    await page.waitForTimeout(2 * 1000)
});
