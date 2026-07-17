import { Page } from "@playwright/test";

export default class CheckoutAsGuestPage {

    private checkoutAsGuestBtnSel = ".checkout-as-guest-button"
    constructor(private page: Page) {
        this.page = page
    }

    public async clickOnCheckoutAsGuestBtn(): Promise<void> {
        await this.page.locator(this.checkoutAsGuestBtnSel).click()
    }
}