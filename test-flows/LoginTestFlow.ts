import { Page, TestInfo, expect } from "@playwright/test";
import LoginPage from "../models/pages/LoginPage.js";
import HomePage from "../models/pages/HomePage.js";
import BaseFlow from "./BaseFlow.js";

export default class LoginTestFlow extends BaseFlow {

    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo);
    }

    public async login(email: string, password: string): Promise<void> {
        const loginPage = new LoginPage(this.page, this.testInfo);
        const loginComp = loginPage.loginComp();
        await loginComp.inputEmail(email);
        await loginComp.inputPassword(password);
        await loginComp.clickLoginBtn();
    }

    public async verifyLoginSuccess(email: string): Promise<void> {
        await expect(this.page).toHaveURL('/');
        const loginAccount = await new HomePage(this.page, this.testInfo).headerComp().getLoginAccount();
        expect(loginAccount).toContain(email);
    }

    public async verifyLoginFailedWithSummaryError(): Promise<void> {
        await expect(this.page).toHaveURL('/login');
        const loginPage = new LoginPage(this.page, this.testInfo);
        const loginComp = loginPage.loginComp();
        const summaryError = await loginComp.getSummaryError();
        expect(summaryError).not.toBeNull();
        expect(summaryError!.trim()).not.toBe('');
    }

    public async verifyLoginFailedWithEmailValidationError(): Promise<void> {
        await expect(this.page).toHaveURL('/login');
        const loginPage = new LoginPage(this.page, this.testInfo);
        const loginComp = loginPage.loginComp();
        const emailValidationError = await loginComp.getEmailValidationError();
        expect(emailValidationError).not.toBeNull();
        expect(emailValidationError!.trim()).not.toBe('');
    }
}
