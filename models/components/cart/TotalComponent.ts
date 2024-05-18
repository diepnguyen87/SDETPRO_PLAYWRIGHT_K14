import { Locator } from "@playwright/test";
import { selector } from "../SelectorDecortor.js";

@selector(".totals")
export default class TotalComponent {

    private tableRowSel = ".cart-total tr"
    private rowLabel = ".cart-total-left span"
    private rowValue = ".cart-total-right .product-price"

    constructor(private component: Locator) {
        this.component = component
    }

    public async priceCategories(): Promise<any> {
        let priceCategories: any = {}
        const tableRowElemList: Locator[] = await this.component.locator(this.tableRowSel).all()
        for (const tableRowElem of tableRowElemList) {
            const catLabel = await tableRowElem.locator(this.rowLabel).innerText()
            const catPrice = await tableRowElem.locator(this.rowValue).innerText()
            priceCategories[catLabel] = catPrice
        }
        return priceCategories
    }
}