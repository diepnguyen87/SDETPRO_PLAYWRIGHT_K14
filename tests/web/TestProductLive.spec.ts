import { test } from "@playwright/test";
import ProductFlowLive from "../../test-flows/ProductFlowLive.spec.js";
import productListData from "../../test-data/login_live/ProductListData.json" assert { type: "json" };

test(`Product Flow`, async ({ page }, testInfo) => {
    await page.goto("/products")
    const productFlow: ProductFlowLive = new ProductFlowLive(page, testInfo);
    await productFlow.addToCartWithManyProduct(productListData);
    await productFlow.verifyProductsInViewCart();
    // productFlow.verifyAddToCartSucceed();
    await page.waitForTimeout(10 * 1000)
});
