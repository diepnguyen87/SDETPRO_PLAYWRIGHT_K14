import { Page, TestInfo } from "@playwright/test";
import BasePage from "./BasePage.js";

export default class HomePageLive extends BasePage {

    private logoutLink = this.page.getByRole('link', { name: ' Logout' });

    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo);
    }

    public async isLogoutLinkDisplayed() {
        await this.logoutLink.isVisible();
    }
}