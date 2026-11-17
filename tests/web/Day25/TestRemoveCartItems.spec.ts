import { test } from "../../fixtures/base.js";
import StandardComputerComponent from "../../../models/components/computer/StandardComputerComponent.js";
import { testData } from "../../../test-data/TestDataProvider.js";
import OrderTestFlow from "../../../test-flows/computer/OrderTestFlow.js";
import { TAG } from "../../../constant/Tag.js";

const standardComputerDataList = testData.standardComputer;

test(`${TAG.regression} | Remove single item from cart`, async ({ page }, testInfo) => {
    await page.goto("/build-your-own-computer")
    const orderTestFlow = new OrderTestFlow(page, StandardComputerComponent, undefined, standardComputerDataList.slice(0, 1), testInfo)
    await orderTestFlow.buildComputerDetailListAndAddToCart()
    await orderTestFlow.navigateToShoppingCartPage()
    await orderTestFlow.removeCartItemsAndVerify([0])
});

test(`${TAG.regression} | Remove one of two items from cart`, async ({ page }, testInfo) => {
    await page.goto("/build-your-own-computer")
    const orderTestFlow = new OrderTestFlow(page, StandardComputerComponent, undefined, standardComputerDataList.slice(0, 2), testInfo)
    await orderTestFlow.buildComputerDetailListAndAddToCart()
    await orderTestFlow.navigateToShoppingCartPage()
    await orderTestFlow.removeCartItemsAndVerify([0])
});

test(`${TAG.regression} | Remove multiple items from cart`, async ({ page }, testInfo) => {
    await page.goto("/build-your-own-computer")
    const orderTestFlow = new OrderTestFlow(page, StandardComputerComponent, undefined, standardComputerDataList, testInfo)
    await orderTestFlow.buildComputerDetailListAndAddToCart()
    await orderTestFlow.navigateToShoppingCartPage()
    await orderTestFlow.removeCartItemsAndVerify([0, 1])
});

test(`${TAG.regression} | Keep items when Update is not clicked, then remove all`, async ({ page }, testInfo) => {
    await page.goto("/build-your-own-computer")
    const orderTestFlow = new OrderTestFlow(page, StandardComputerComponent, undefined, standardComputerDataList.slice(0, 2), testInfo)
    await orderTestFlow.buildComputerDetailListAndAddToCart()
    await orderTestFlow.navigateToShoppingCartPage()
    await orderTestFlow.selectRemoveWithoutUpdateAndVerify([0])
    await orderTestFlow.removeCartItemsAndVerify([0, 1])
});

test(`${TAG.regression} | Cart stays unchanged when the update request fails`, async ({ page }, testInfo) => {
    await page.goto("/build-your-own-computer")
    const orderTestFlow = new OrderTestFlow(page, StandardComputerComponent, undefined, standardComputerDataList.slice(0, 2), testInfo)
    await orderTestFlow.buildComputerDetailListAndAddToCart()
    await orderTestFlow.navigateToShoppingCartPage()
    await orderTestFlow.removeCartItemsWithFailedUpdateAndVerify([0])
});
