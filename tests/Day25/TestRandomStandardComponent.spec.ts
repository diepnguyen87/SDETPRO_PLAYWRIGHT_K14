import { test } from "@playwright/test";
import StandardComputerComponent from "../../models/components/computer/StandardComputerComponent.js";
import OrderTestFlow from "../../test-flows/computer/OrderTestFlow.js";
import randomStandardComputerData from "../../test-data/RandomStandardComputer.json" assert { type: "json" };

test('Test Random Standard Component', async ({ page }) => {
    await page.goto("https://demowebshop.tricentis.com/build-your-own-computer")

    const orderTestFlow: OrderTestFlow = new OrderTestFlow(page, StandardComputerComponent, randomStandardComputerData, undefined)
    await orderTestFlow.buildRandomComputerDetailListAndAddToCart(3)
    await orderTestFlow.navigateToShoppingCartPage()
    await orderTestFlow.showShoppingCart()
});