import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import Component from "../Component.js";

@selector(".cart-item-row")
export default class CartItemRowComponent extends Component{

    private productUnitPriceSel = ".product-unit-price"
    private quantityInputSel = ".qty-input"
    private productSubTotalSel = ".product-subtotal"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async getProductUnitPrice(): Promise<number> {
        return Number(await this.withHealing(this.productUnitPriceSel, l => l.textContent()))
    }

    public async getQuantity(): Promise<number> {
        return Number(await this.withHealing(this.quantityInputSel, l => l.inputValue()))
    }

    public async getProductSubTotal(): Promise<number> {
        return Number(await this.withHealing(this.productSubTotalSel, l => l.textContent()))
    }

    public async selectRemove(): Promise<void> {
        await this.componentLocator.getByRole("checkbox").check()
    }
}