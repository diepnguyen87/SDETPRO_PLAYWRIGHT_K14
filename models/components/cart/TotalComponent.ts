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
        const tableRowCount = await this.withHealing(this.tableRowSel, async l => {
            await l.first().waitFor();
            return await l.count();
        })
        const catLabelList = await this.withHealing(this.rowLabel, l => l.allInnerTexts())
        const catPriceList = await this.withHealing(this.rowValue, l => l.allInnerTexts())
        if (catLabelList.length !== tableRowCount || catPriceList.length !== tableRowCount) {
            throw new Error(`Expected ${tableRowCount} price rows but found ${catLabelList.length} labels and ${catPriceList.length} prices`)
        }
        catLabelList.forEach((catLabel, index) => {
            priceCategories[catLabel] = Number(catPriceList[index])
        })
        return priceCategories
    }

    public async isTermOfServiceChecked(): Promise<boolean> {
        return await this.withHealing(this.termOfServiceSel, l => l.isChecked());
    }

    public async selectTermOfService(): Promise<void> {
        await this.withHealing(this.termOfServiceSel, l => l.click());
    }

    public async clickOnCheckoutBtn(): Promise<void> {
        await this.withHealing(this.checkoutBtnSel, l => l.click());
    }
}