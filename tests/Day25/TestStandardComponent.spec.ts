import { Locator, test } from "@playwright/test";
import OrderTestFlow from "../../test-flows/computer/OrderTestFlow.js";
import CheapComputerComponent from "../../models/components/computer/CheapComputerComponent.js";
import { Urls } from "../../url/Urls.js";
import StandardComputerComponent from "../../models/components/computer/StandardComputerComponent.js";

test('Test Standard Component', async ({ page }) => {
    await page.goto("https://demowebshop.tricentis.com/build-your-own-computer")

    const orderTestFlow: OrderTestFlow = new OrderTestFlow(page, StandardComputerComponent)
    await orderTestFlow.buildComputerDetailAndAddToCart();
});