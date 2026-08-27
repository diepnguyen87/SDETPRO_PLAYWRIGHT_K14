import { Page, TestInfo } from "@playwright/test";
import BasePage from "./BasePage.js";
import ProductListComponent from "../components/productLive/ProductListComponent.js";
import AddToCartSucceedPopup from "../components/productLive/AddToCartSucceedPopup.js";

export default class ProductPageLive extends BasePage {

    private searchProductInput = this.page.getByPlaceholder('Search Product');
    private searchBtn = this.page.locator('#submit_search');

    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo)
    }

    public async searchProduct(productName: string) {
        await this.searchProductInput.fill(productName);
    }

    public async clickSearch() {
        await this.searchBtn.click()
    }

    public productListComponent() {
        return new ProductListComponent(this.page, this.page.locator(ProductListComponent.selectorValue), this.testInfo)
    }

    public addToCartSucceedPopup() {
        return new AddToCartSucceedPopup(this.page, this.page.locator(AddToCartSucceedPopup.selectorValue), this.testInfo)
    }
}