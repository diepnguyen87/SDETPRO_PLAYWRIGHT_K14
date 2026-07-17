import { Locator } from "@playwright/test";

export default class ProductItemComponent {
    public static selector = "div.product-item"
    private productTitleSel = "h2.product-title"
    private actualPriceSel = "span.actual-price"

    constructor(private component: Locator) {
        this.component = component
    }

    getProductTitle(): Locator {
        return this.component.locator(this.productTitleSel)
    }

    actualPrice(): Locator {
        return this.component.locator(this.actualPriceSel)
    }
}