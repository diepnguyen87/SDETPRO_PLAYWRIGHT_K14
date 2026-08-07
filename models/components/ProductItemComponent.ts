import { Locator, Page, TestInfo } from "@playwright/test";
import Component from "./Component.js";

export default class ProductItemComponent extends Component {
    public static selector = "div.product-item"
    private productTitleSel = "h2.product-title"
    private actualPriceSel = "span.actual-price"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    getProductTitle(): Locator {
        return this.componentLocator.locator(this.productTitleSel)
    }

    actualPrice(): Locator {
        return this.componentLocator.locator(this.actualPriceSel)
    }
}