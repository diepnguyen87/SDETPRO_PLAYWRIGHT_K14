import { test } from "@playwright/test";
import StandardComputerComponent from "../../models/components/computer/StandardComputerComponent.js";
import OrderTestFlow from "../../test-flows/computer/OrderTestFlow.js";

test('Test Standard Component', async ({ page }) => {
    await page.goto("https://demowebshop.tricentis.com/build-your-own-computer")

    const orderTestFlow: OrderTestFlow = new OrderTestFlow(page, StandardComputerComponent)
    await orderTestFlow.buildComputerDetailAndAddToCart();
});