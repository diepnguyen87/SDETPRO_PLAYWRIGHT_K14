import { Page, TestInfo } from "@playwright/test";
import BasePage from "./BasePage.js";

export default class LoginPageLive extends BasePage {

    private emailInput = this.page.getByTestId('login-email');
    private passwordInput = this.page.getByTestId('login-password');
    private loginBtn = this.page.getByTestId('login-button');

    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo)
        this.page = page;
    }

    public async inputEmail(email: string) {
        await this.emailInput.click();
        await this.emailInput.fill(email);
    }

    public async inputPassword(password: string) {
        await this.passwordInput.click();
        await this.passwordInput.fill(password);
    }

    public async clickLogin() {
        await this.loginBtn.click();
    }
}