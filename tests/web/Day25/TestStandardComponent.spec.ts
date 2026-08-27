import { test } from "@playwright/test";
import paymentMethods from "../../../constant/PaymentMethod.js";
import StandardComputerComponent from "../../../models/components/computer/StandardComputerComponent.js";
import standardComputerDataList from "../../../test-data/StandardComputer.json" assert { type: "json" };
import OrderTestFlow from "../../../test-flows/computer/OrderTestFlow.js";
import { getCreditCardNumber } from "../../../utils/GetCreditCardNumber.js";
import { TAG } from "../../../constant/Tag.js";
import SelfHealingSuccess from "../../../ai/SelfHealingSuccess.js";

test(`${TAG.smoke} | Test Standard Component`, async ({ page }, testInfo) => {
    try {
        await page.goto("/build-your-own-computer")
        const orderTestFlow: OrderTestFlow = new OrderTestFlow(page, StandardComputerComponent, undefined, standardComputerDataList, testInfo)
        await orderTestFlow.buildComputerDetailListAndAddToCart();
        await orderTestFlow.navigateToShoppingCartPage()
        await orderTestFlow.verifyShoppingCart()
        await orderTestFlow.selectTOSandCheckout()
        await orderTestFlow.inputBillingAddress()
        await orderTestFlow.inputShippingAddress()
        await orderTestFlow.selectShippingMethod()
        await orderTestFlow.selectPaymentMethod(paymentMethods.creditCard)
        await orderTestFlow.inputPaymentInfo(await getCreditCardNumber('Visa'))
        await orderTestFlow.confirmOrder()
        await orderTestFlow.checkoutCompleted()

        await page.waitForTimeout(2 * 1000)
    } catch (error) {
        if (error instanceof SelfHealingSuccess) {
            console.log(
                "Self-healing succeeded. " +
                "Original test execution stopped."
            );
            return;
        }
        throw error;
    }
});