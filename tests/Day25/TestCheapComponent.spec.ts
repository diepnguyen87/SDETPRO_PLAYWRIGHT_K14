import { test } from "@playwright/test";
import CheapComputerComponent from "../../models/components/computer/CheapComputerComponent.js";
import OrderTestFlow from "../../test-flows/computer/OrderTestFlow.js";
import cheapComputerDataList from "../../test-data/CheapComputer.json" assert { type: "json" };

test('Test Cheap Component', async ({ page }) => {
    await page.goto("https://demowebshop.tricentis.com/build-your-cheap-own-computer")
    const orderTestFlow: OrderTestFlow = new OrderTestFlow(page, CheapComputerComponent, undefined, cheapComputerDataList)
    await orderTestFlow.buildComputerDetailListAndAddToCart()
    await orderTestFlow.navigateToShoppingCartPage()
    await orderTestFlow.showShoppingCart()
});