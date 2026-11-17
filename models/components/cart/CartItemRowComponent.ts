import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import Component from "../Component.js";

@selector(".cart-item-row")
export default class CartItemRowComponent extends Component{

    private productUnitPriceSel = ".product-unit-price"
    private quantityInputSel = ".qty-input"
    private productSubTotalSel = ".product-subtotal"
    private productNameSel = ".product-name"
    private attributesSel = ".attributes"
    private removeBtnName = /remove/i

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async getProductName(): Promise<string> {
        return (await this.withHealing(this.productNameSel, l => l.innerText())).trim()
    }

    public async getAttributes(): Promise<string> {
        return (await this.withHealing(this.attributesSel, l => l.innerText())).trim()
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

    public async isRemoveSelected(): Promise<boolean> {
        return await this.componentLocator.getByRole("checkbox").isChecked()
    }

    public async hasRemoveButton(): Promise<boolean> {
        return (await this.componentLocator.getByRole("button", { name: this.removeBtnName }).count()) > 0
    }
}