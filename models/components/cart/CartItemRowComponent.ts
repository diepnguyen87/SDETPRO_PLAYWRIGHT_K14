import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import Component from "../Component.js";

@selector(".cart-item-row")
export default class CartItemRowComponent extends Component{

    private productUnitPriceSel = ".product-unit-price"
    private qualityInputSel = ".qty-input"
    private productSubTotalSel = ".product-subtotal"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async getProductUnitPrice(): Promise<number> {
        return Number(await this.componentLocator.locator(this.productUnitPriceSel).textContent())
    }

    public qualityInput(): Locator {
        return this.componentLocator.locator(this.qualityInputSel);
    }

    public async getProductSubTotal(): Promise<Number> {
        return Number(await this.componentLocator.locator(this.productSubTotalSel).textContent())
    }
}