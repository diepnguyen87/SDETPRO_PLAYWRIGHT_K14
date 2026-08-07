import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "./SelectorDecorator.js";
import Component from "./Component.js";

@selector(".product-essential")
export default class BaseItemDetailComponent extends Component {

    private productPriceSel: string = "div.product-price"
    private productQualitySel: string = "input.qty-input"
    private addToCartSel: string = "input[id^='add-to-cart-button']"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async getProductPrice(): Promise<number> {
        return Number(await this.componentLocator.locator(this.productPriceSel).textContent())
    }

    public productQuality(): Locator {
        return this.componentLocator.locator(this.productQualitySel)
    }

    public async clickOnAddToCartBtn(): Promise<void> {
        await this.componentLocator.locator(this.addToCartSel).click()
    }
}