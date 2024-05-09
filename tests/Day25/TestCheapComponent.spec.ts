import { test } from "@playwright/test";
import OrderTestFlow from "../../test-flows/computer/OrderTestFlow.js";
import CheapComputerComponent from "../../models/components/computer/CheapComputerComponent.js";
import { Urls } from "../../url/Urls.js";

test('Test Cheap Component', async ({ page }) => {
    await page.goto("https://demowebshop.tricentis.com/build-your-cheap-own-computer")
    const orderTestFlow: OrderTestFlow = new OrderTestFlow(page, CheapComputerComponent)
    await orderTestFlow.buildComputerDetailAndAddToCart();
});