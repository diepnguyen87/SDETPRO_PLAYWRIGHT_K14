import { test, expect, _android as android } from '@playwright/test';
import paymentMethods from "../../constant/PaymentMethod.js";
import StandardComputerComponent from "../../models/components/computer/StandardComputerComponent.js";
import standardComputerDataList from "../../test-data/StandardComputer.json" assert { type: "json" };
import OrderTestFlow from "../../test-flows/computer/OrderTestFlow.js";
import { getCreditCardNumber } from "../../utils/GetCreditCardNumber.js";
import TAG from "../../constant/Tag.js";

test(`${TAG} | Test Standard Component`, async ({ page }) => {
    const devices = await android.devices();

    expect(
        devices.length,
        'No authenticated Android device was found through ADB'
    ).toBeGreaterThan(0);

    const device = devices[0];

    try {
        const context = await device.launchBrowser({
            baseURL: 'https://demowebshop.tricentis.com',
        });

        const pages = context.pages();
        const page = pages[0] ?? await context.newPage();

        await page.goto("/build-your-own-computer")
        const orderTestFlow: OrderTestFlow = new OrderTestFlow(page, StandardComputerComponent, undefined, standardComputerDataList)
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
    } finally {
        await device.close();
    }
});