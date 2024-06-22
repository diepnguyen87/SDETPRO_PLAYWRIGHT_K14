import { test } from "@playwright/test";
import StandardComputerComponent from "../../models/components/computer/StandardComputerComponent.js";
import OrderTestFlow from "../../test-flows/computer/OrderTestFlow.js";
import randomStandardComputerData from "../../test-data/RandomStandardComputer.json" assert { type: "json" };
import paymentMethods from "../../constant/PaymentMethod.js";
import { getCreditCardNumber } from "../../utils/GetCreditCardNumber.js";

test('Test Random Standard Component', async ({ page }) => {
    await page.goto("https://demowebshop.tricentis.com/build-your-own-computer")

    const orderTestFlow: OrderTestFlow = new OrderTestFlow(page, StandardComputerComponent, randomStandardComputerData, undefined)
    await orderTestFlow.buildRandomComputerDetailListAndAddToCart(3)
    await orderTestFlow.navigateToShoppingCartPage()
    await orderTestFlow.verifyShoppingCart()
    await orderTestFlow.selectTOSandCheckout()
    await orderTestFlow.inputBillingAddress()
    await orderTestFlow.inputShippingAddress()
    await orderTestFlow.selectShippingMethod()
    await orderTestFlow.selectPaymentMethod(paymentMethods.creditCard)
    await orderTestFlow.inputPaymentInfo(await getCreditCardNumber('AmericanExpress'))
    await orderTestFlow.confirmOrder()
    await orderTestFlow.checkoutCompleted()

    await page.waitForTimeout(2 * 1000)
});