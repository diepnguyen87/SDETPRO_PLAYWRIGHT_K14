import { Page, TestInfo } from "@playwright/test";
import BasePage from "./BasePage.js";

export default class OrderDetailsPage extends BasePage {

    private readonly paymentMethodSel = ".payment-method"

    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo)
    }

    public async getPaymentMethod(): Promise<string> {
        await this.ensureLoaded()
        return (await this.withHealing(this.paymentMethodSel, l => l.innerText())).trim()
    }
}
