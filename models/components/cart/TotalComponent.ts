import { Locator } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";

@selector(".order-summary-content .totals")
export default class TotalComponent {

    private tableRowSel = ".cart-total tr"
    private rowLabel = ".cart-total-left span.nobr"
    private rowValue = ".cart-total-right .product-price"
    private termOfServiceSel = "#termsofservice"
    private checkoutBtnSel = "#checkout"

    constructor(private component: Locator) {
        this.component = component
    }

    public async priceCategories(): Promise<any> {
        let priceCategories: any = {}
        const tableRowElemList: Locator[] = await this.component.locator(this.tableRowSel).all()
        for (const tableRowElem of tableRowElemList) {
            const catLabel = await tableRowElem.locator(this.rowLabel).innerText()
            const catPrice = Number(await tableRowElem.locator(this.rowValue).innerText())
            priceCategories[catLabel] = catPrice
        }
        return priceCategories
    }

    public async selectTermOfService(): Promise<void> {
        await this.component.locator(this.termOfServiceSel).click()
    }

    public async clickOnCheckoutBtn(): Promise<void> {
        await this.component.locator(this.checkoutBtnSel).click()
    }
}