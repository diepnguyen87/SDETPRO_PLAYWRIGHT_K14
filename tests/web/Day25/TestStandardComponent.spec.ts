import { test } from "../../fixtures/base.js";
import paymentMethods from "../../../constant/PaymentMethod.js";
import StandardComputerComponent from "../../../models/components/computer/StandardComputerComponent.js";
import { testData } from "../../../test-data/TestDataProvider.js";
import OrderTestFlow from "../../../test-flows/computer/OrderTestFlow.js";
import { getCreditCardNumber } from "../../../utils/GetCreditCardNumber.js";
import { TAG } from "../../../constant/Tag.js";

const standardComputerDataList = testData.standardComputer;

test(`${TAG.smoke} | Test Credit Card Checkout`, async ({ page, browser }, testInfo) => {
    await page.goto("/build-your-own-computer")
    const orderTestFlow: OrderTestFlow = new OrderTestFlow(page, StandardComputerComponent, undefined, standardComputerDataList, testInfo)
    await orderTestFlow.buildComputerDetailListAndAddToCart();
    await orderTestFlow.navigateToShoppingCartPage()
    await orderTestFlow.verifyShoppingCart()
    await orderTestFlow.checkoutWithoutTOSAndVerifyWarningPopup()
    await orderTestFlow.selectTOSandCheckoutAsGuest()
    await orderTestFlow.inputBillingAddress()
    await orderTestFlow.inputShippingAddress()
    await orderTestFlow.selectShippingMethod()
    await orderTestFlow.selectPaymentMethod(paymentMethods.creditCard)
    await orderTestFlow.inputPaymentInfo(await getCreditCardNumber('Visa'))
    await orderTestFlow.confirmOrder()
    await orderTestFlow.checkoutCompleted()

    await page.waitForTimeout(2 * 1000)
});

test(`${TAG.smoke} | Test Cash On Delivery Checkout`, async ({ page, browser }, testInfo) => {
    await page.goto("/build-your-own-computer")
    const orderTestFlow = new OrderTestFlow(
        page,
        StandardComputerComponent,
        undefined,
        standardComputerDataList,
        testInfo
    )

    await orderTestFlow.buildComputerDetailListAndAddToCart();
    await orderTestFlow.navigateToShoppingCartPage();
    await orderTestFlow.verifyShoppingCart();
    await orderTestFlow.checkoutWithoutTOSAndVerifyWarningPopup();
    await orderTestFlow.selectTOSandCheckoutAsGuest();
    await orderTestFlow.inputBillingAddress();
    await orderTestFlow.inputShippingAddress();
    await orderTestFlow.selectShippingMethod();
    await orderTestFlow.selectCashOnDeliveryPaymentMethod();
    await orderTestFlow.confirmOrder();
    await orderTestFlow.checkoutCompleted();
    await orderTestFlow.verifyOrderDetailsPaymentMethod(paymentMethods.cashOnDelivery);
});

