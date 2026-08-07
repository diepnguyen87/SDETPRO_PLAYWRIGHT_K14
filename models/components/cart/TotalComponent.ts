import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import Component from "../Component.js";

@selector(".order-summary-content .totals")
export default class TotalComponent extends Component {

    private tableRowSel = ".cart-total tr"
    private rowLabel = ".cart-total-left span.nobr"
    private rowValue = ".cart-total-right .product-price"
    private termOfServiceSel = "#termsofservice"
    private checkoutBtnSel = "#checkout"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async priceCategories(): Promise<any> {
        let priceCategories: any = {}
        const tableRowElemList: Locator[] = await this.componentLocator.locator(this.tableRowSel).all()
        for (const tableRowElem of tableRowElemList) {
            const catLabel = await tableRowElem.locator(this.rowLabel).innerText()
            const catPrice = Number(await tableRowElem.locator(this.rowValue).innerText())
            priceCategories[catLabel] = catPrice
        }
        return priceCategories
    }

    public async selectTermOfService(): Promise<void> {
        await this.componentLocator.locator(this.termOfServiceSel).click()
    }

    public async clickOnCheckoutBtn(): Promise<void> {
        // await this.componentLocator.locator(this.checkoutBtnSel).click()
        await this.click(this.checkoutBtnSel, this.componentLocator.locator(this.checkoutBtnSel));
    }
}