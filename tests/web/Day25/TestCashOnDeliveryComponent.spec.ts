import { test } from "../../fixtures/base.js";
import paymentMethods from "../../../constant/PaymentMethod.js";
import StandardComputerComponent from "../../../models/components/computer/StandardComputerComponent.js";
import { testData } from "../../../test-data/TestDataProvider.js";
import OrderTestFlow from "../../../test-flows/computer/OrderTestFlow.js";
import { TAG } from "../../../constant/Tag.js";

const standardComputerDataList = testData.standardComputer;

test(`${TAG.smoke} | Test Cash On Delivery Checkout`, async ({ page, browser }, testInfo) => {
    console.log(browser.version())
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
