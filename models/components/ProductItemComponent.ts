import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "./SelectorDecorator.js";
import Component from "./Component.js";

@selector("div.product-item")
export default class ProductItemComponent extends Component {
    private productTitleSel = "h2.product-title"
    private actualPriceSel = "span.actual-price"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async getProductTitle(): Promise<string | null> {
        return await this.withHealing(this.productTitleSel, l => l.textContent())
    }

    public async getActualPrice(): Promise<string | null> {
        return await this.withHealing(this.actualPriceSel, l => l.textContent())
    }
}