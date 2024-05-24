import { Locator } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";

@selector(".cart-item-row")
export default class CartItemRowComponent {

    private productUnitPriceSel = ".product-unit-price"
    private qualityInputSel = ".qty-input"
    private productSubTotalSel = ".product-subtotal"

    constructor(private component: Locator) {
        this.component = component
    }

    public async getProductUnitPrice(): Promise<Number> {
        return Number(await this.component.locator(this.productUnitPriceSel).textContent())
    }

    public qualityInput(): Locator {
        return this.component.locator(this.qualityInputSel);
    }

    public async getProductSubTotal(): Promise<Number> {
        return Number(await this.component.locator(this.productSubTotalSel).textContent())
    }
}