import { test } from "@playwright/test";
import paymentMethods from "../../constant/PaymentMethod.js";
import CheapComputerComponent from "../../models/components/computer/CheapComputerComponent.js";
import randomCheapComputerData from "../../test-data/RandomCheapComputer.json" assert { type: "json" };
import OrderTestFlow from "../../test-flows/computer/OrderTestFlow.js";
import { getCreditCardNumber } from "../../utils/GetCreditCardNumber.js";

test('Test Random Cheap Component', async ({ page }) => {
    await page.goto("https://demowebshop.tricentis.com/build-your-cheap-own-computer")
    const orderTestFlow: OrderTestFlow = new OrderTestFlow(page, CheapComputerComponent, randomCheapComputerData, undefined)
    await orderTestFlow.buildRandomComputerDetailListAndAddToCart(3)
    await orderTestFlow.navigateToShoppingCartPage()
    await orderTestFlow.verifyShoppingCart()
    await orderTestFlow.selectTOSandCheckout()
    await orderTestFlow.inputBillingAddress()
    await orderTestFlow.inputShippingAddress()
    await orderTestFlow.selectShippingMethod()
    await orderTestFlow.selectPaymentMethod(paymentMethods.creditCard)
    await orderTestFlow.inputPaymentInfo(await getCreditCardNumber('Discover'))
    await orderTestFlow.confirmOrder()
    await orderTestFlow.checkoutCompleted()
    
    await page.waitForTimeout(2 * 1000)
});