import "dotenv/config";
import { test } from "../../fixtures/base.js";
import paymentMethods from "../../../constant/PaymentMethod.js";
import StandardComputerComponent from "../../../models/components/computer/StandardComputerComponent.js";
import standardComputerDataList from "../../../test-data/StandardComputer.json" assert { type: "json" };
import OrderTestFlow from "../../../test-flows/computer/OrderTestFlow.js";
import { getCreditCardNumber } from "../../../utils/GetCreditCardNumber.js";
import { TAG } from "../../../constant/Tag.js";

test(`${TAG.smoke} | Test Standard Component With Login`, async ({ page }, testInfo) => {
    const idx = process.env.CREDENTIAL_INDEX !== undefined
                ? Number(process.env.CREDENTIAL_INDEX)
                : testInfo.parallelIndex;
                
    const email    = process.env[`LOGIN_EMAIL_${idx}`]
    const password = process.env[`LOGIN_PASSWORD_${idx}`]

    test.skip(
        !email || !password,
        `Credentials for worker ${idx} not set. Provide LOGIN_EMAIL_${idx}/LOGIN_PASSWORD_${idx}`
    );

    await page.goto('/build-your-own-computer');
    const orderTestFlow = new OrderTestFlow(page, StandardComputerComponent, undefined, standardComputerDataList, testInfo);
    await orderTestFlow.buildComputerDetailListAndAddToCart();
    await orderTestFlow.navigateToShoppingCartPage();
    await orderTestFlow.verifyShoppingCart();
    await orderTestFlow.selectTOSandCheckoutWithLogin(email!, password!);
    await orderTestFlow.inputBillingAddressOrUseSaved();
    await orderTestFlow.inputShippingAddress();
    await orderTestFlow.selectShippingMethod();
    await orderTestFlow.selectPaymentMethod(paymentMethods.creditCard);
    await orderTestFlow.inputPaymentInfo(await getCreditCardNumber('Visa'));
    await orderTestFlow.confirmOrder();
    await orderTestFlow.checkoutCompleted();
});
