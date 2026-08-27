import { expect, Locator, Page, TestInfo } from "@playwright/test";
import BaseFlow from "./BaseFlow.js";
import ProductPage from "../models/pages/ProductPage.js";
import ProductComponent from "../models/components/ProductComponent.js";

export default class ProductFlow extends BaseFlow {

    private productPage: ProductPage;
    private productComp: ProductComponent;

    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo)
        this.productPage = new ProductPage(this.page, this.testInfo);
        this.productComp = this.productPage.productComp();
    }

    private isProductEmpty(productName: string) {
        if (!productName.trim()) {
            throw new Error(`Product name is empty`);
        }
        return true;
    }

    private async verifySelectedProductLocator(selectedProductLocator: Locator, productName: string) {
        const selectedProductNumber = await selectedProductLocator.count();
        if (selectedProductNumber === 0) {
            throw new Error(`Product name not found: ${productName}`);
        } else if (selectedProductNumber > 1) {
            throw new Error(`Duplicate product name: ${productName}`)
        }
    }

    async addToCart(productName: string): Promise<void> {
        if (!this.isProductEmpty(productName)) {
            const selectedProductLocator = this.productComp.getProductLocatorByName(productName);
            this.verifySelectedProductLocator(selectedProductLocator, productName)
            this.productComp.getAddToCartLocator(selectedProductLocator).click();
        }
    }

    async getPrice(productName: string): Promise<string> {
        let price = null;
        if (!this.isProductEmpty(productName)) {
            const selectedProductLocator = this.productComp.getProductLocatorByName(productName);
            this.verifySelectedProductLocator(selectedProductLocator, productName)
            price = await this.productComp.getPrice(selectedProductLocator);
        }

        if (!price?.trim()) {
            throw new Error(`Price not found for product: ${productName}`);
        }
        return price;
    }

    async isProductDisplayed(productName: string): Promise<boolean> {
        if (productName.length === 0) {
            throw new Error(`Product name is empty`);
        }
        const selectedProduct = this.productComp.getProductLocatorByName(productName);
        return selectedProduct.isVisible();
    }

    async verifyShoppingCartQty(expectedQty: number) {
        const qty = await this.productPage?.headerComp().getCartQty();
        await expect(qty).toHaveText("(1)");
    }
}
