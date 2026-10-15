import { test } from "@playwright/test";
import paymentMethods from "../../../constant/PaymentMethod.js";
import CheapComputerComponent from "../../../models/components/computer/CheapComputerComponent.js";
import { testData } from "../../../test-data/TestDataProvider.js";
import OrderTestFlow from "../../../test-flows/computer/OrderTestFlow.js";
import { getCreditCardNumber } from "../../../utils/GetCreditCardNumber.js";
import { TAG } from "../../../constant/Tag.js";

const cheapComputerDataList = testData.cheapComputer;

test(`${TAG.regression} | Test Cheap Component`, async ({ page }, testInfo) => {
    await page.goto("/build-your-cheap-own-computer")
    const orderTestFlow: OrderTestFlow = new OrderTestFlow(page, CheapComputerComponent, undefined, cheapComputerDataList, testInfo)
    await orderTestFlow.buildComputerDetailListAndAddToCart()
    await orderTestFlow.navigateToShoppingCartPage()
    await orderTestFlow.verifyShoppingCart()
    await orderTestFlow.selectTOSandCheckoutAsGuest()
    await orderTestFlow.inputBillingAddress()
    await orderTestFlow.inputShippingAddress()
    await orderTestFlow.selectShippingMethod()
    await orderTestFlow.selectPaymentMethod(paymentMethods.creditCard)
    await orderTestFlow.inputPaymentInfo(await getCreditCardNumber('Mastercard'))
    await orderTestFlow.confirmOrder()
    await orderTestFlow.checkoutCompleted()

    await page.waitForTimeout(2 * 1000)
});
