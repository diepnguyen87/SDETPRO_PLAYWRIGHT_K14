import { Locator, Page, TestInfo } from "@playwright/test";
import Component from "../Component.js";
import { selector } from "../SelectorDecorator.js";

@selector("//p[text()='productName']//ancestor::div[@class='product-image-wrapper']")
export default class ProductImageWrapperComponent extends Component {

    private addToCartLink = this.componentLocator.locator('.product-overlay a.add-to-cart')

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async clickAddToCart() {
        await this.componentLocator.hover();
        await this.addToCartLink.click()
    }
}