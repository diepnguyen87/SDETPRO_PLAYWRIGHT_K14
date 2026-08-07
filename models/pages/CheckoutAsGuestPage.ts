import { Page, TestInfo } from "@playwright/test";
import BasePage from "./BasePage.js";

export default class CheckoutAsGuestPage extends BasePage {

    private checkoutAsGuestBtnSel = ".checkout-as-guest-button"
    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo)
    }

    public async clickOnCheckoutAsGuestBtn(): Promise<void> {
        await this.page.locator(this.checkoutAsGuestBtnSel).click()
    }
}