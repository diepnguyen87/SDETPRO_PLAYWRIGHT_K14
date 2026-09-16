import { Page, TestInfo } from "@playwright/test";
import LoginComponent from "../components/LoginComponent.js";
import BasePage from "./BasePage.js";

export default class CheckoutAsGuestPage extends BasePage {

    private checkoutAsGuestBtnSel = ".checkout-as-guest-button"
    
    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo)
    }

    public async clickOnCheckoutAsGuestBtn(): Promise<void> {
        await this.page.locator(this.checkoutAsGuestBtnSel).click()
    }

    loginComp(): LoginComponent {
        return new LoginComponent(this.page, this.page.locator(LoginComponent.selectorValue), this.testInfo);
    }
}