import { Locator } from "@playwright/test";
import { selector } from "./SelectorDecortor.js";

@selector(".product-essential")
export default class BaseItemDetailComponent {

    private productPriceSel: string = "div.product-price"
    private productQualitySel: string = "input.qty-input"
    private addToCartSel: string = "input[id^='add-to-cart-button']"

    constructor(protected component: Locator) {
        this.component = component
    }

    public async getProductPrice(): Promise<number> {
        return Number(await this.component.locator(this.productPriceSel).textContent())
    }

    public productQuality(): Locator {
        return this.component.locator(this.productQualitySel)
    }

    public async clickOnAddToCartBtn(): Promise<void> {
        await this.component.locator(this.addToCartSel).click()
    }
}