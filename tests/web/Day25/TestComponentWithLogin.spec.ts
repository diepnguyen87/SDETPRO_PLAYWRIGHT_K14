import "dotenv/config";
import { test } from "../../fixtures/base.js";
import paymentMethods from "../../../constant/PaymentMethod.js";
import StandardComputerComponent from "../../../models/components/computer/StandardComputerComponent.js";
import standardComputerDataList from "../../../test-data/StandardComputer.json" with { type: "json" };
import CheapComputerComponent from "../../../models/components/computer/CheapComputerComponent.js";
import cheapComputerDataList from "../../../test-data/CheapComputer.json" with { type: "json" };
import OrderTestFlow from "../../../test-flows/computer/OrderTestFlow.js";
import BaseFlow from "../../../test-flows/BaseFlow.js";
import { getCreditCardNumber } from "../../../utils/GetCreditCardNumber.js";
import { TAG } from "../../../constant/Tag.js";

test.use({ loggedIn: true });

test.afterEach(async ({ page }, testInfo) => {
    const status = testInfo.status
    const needsCleanup =
        status === "failed" || status === "timedOut" || status === "interrupted" ||
        testInfo.annotations.some(a => a.type === "self-healed")
    if (!needsCleanup) return

    await new BaseFlow(page, testInfo).clearShoppingCart()
});

test(`${TAG.smoke} | Test Standard Component With Login`, async ({ page, credential }, testInfo) => {
    test.skip(!credential, "Login credentials not set for this worker. Provide LOGIN_EMAIL_<idx>/LOGIN_PASSWORD_<idx>");

    await page.goto('/build-your-own-computer');
    const orderTestFlow = new OrderTestFlow(page, StandardComputerComponent, undefined, standardComputerDataList, testInfo);
    await orderTestFlow.buildComputerDetailListAndAddToCart();
    await orderTestFlow.navigateToShoppingCartPage();
    await orderTestFlow.verifyShoppingCart();
    await orderTestFlow.checkoutWithoutTOSAndVerifyWarningPopup();
    await orderTestFlow.selectTOSAndCheckout();
    await orderTestFlow.inputBillingAddressOrUseSaved();
    await orderTestFlow.inputShippingAddress();
    await orderTestFlow.selectShippingMethod();
    await orderTestFlow.selectPaymentMethod(paymentMethods.creditCard);
    await orderTestFlow.inputPaymentInfo(await getCreditCardNumber('Visa'));
    await orderTestFlow.confirmOrder();
    await orderTestFlow.checkoutCompleted();
});


test(`${TAG.regression} | Test Cheap Component With Login`, async ({ page, credential }, testInfo) => {
    test.skip(!credential, "Login credentials not set for this worker. Provide LOGIN_EMAIL_<idx>/LOGIN_PASSWORD_<idx>");

    await page.goto("/build-your-cheap-own-computer")
    const orderTestFlow: OrderTestFlow = new OrderTestFlow(page, CheapComputerComponent, undefined, cheapComputerDataList, testInfo)
    await orderTestFlow.buildComputerDetailListAndAddToCart()
    await orderTestFlow.navigateToShoppingCartPage()
    await orderTestFlow.verifyShoppingCart()
    await orderTestFlow.checkoutWithoutTOSAndVerifyWarningPopup();
    await orderTestFlow.selectTOSAndCheckout();
    await orderTestFlow.inputBillingAddressOrUseSaved();
    await orderTestFlow.inputShippingAddress()
    await orderTestFlow.selectShippingMethod()
    await orderTestFlow.selectPaymentMethod(paymentMethods.creditCard)
    await orderTestFlow.inputPaymentInfo(await getCreditCardNumber('Mastercard'))
    await orderTestFlow.confirmOrder()
    await orderTestFlow.checkoutCompleted()
});
