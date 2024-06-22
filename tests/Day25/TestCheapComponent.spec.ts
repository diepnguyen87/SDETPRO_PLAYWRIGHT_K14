import { test } from "@playwright/test";
import CheapComputerComponent from "../../models/components/computer/CheapComputerComponent.js";
import OrderTestFlow from "../../test-flows/computer/OrderTestFlow.js";
import cheapComputerDataList from "../../test-data/CheapComputer.json" assert { type: "json" };
import paymentMethods from "../../constant/PaymentMethod.js";
import { cardType } from "../../type/DataType.js";
import { getCreditCardNumber } from "../../utils/GetCreditCardNumber.js";

test('Test Cheap Component', async ({ page }) => {
    await page.goto("https://demowebshop.tricentis.com/build-your-cheap-own-computer")
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