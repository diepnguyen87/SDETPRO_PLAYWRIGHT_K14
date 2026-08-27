import { expect, Page, TestInfo } from "@playwright/test"
import BaseFlow from "./BaseFlow.js"
import LoginPageLive from "../models/pages/LoginPageLive.js";
import HomePageLive from "../models/pages/HomePageLive.js";
import validator from "validator";

export default class LoginFlow extends BaseFlow {
    private loginPage: LoginPageLive;
    private homePage: HomePageLive;

    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo)
        this.loginPage = new LoginPageLive(page, testInfo);
        this.homePage = new HomePageLive(page, testInfo);
    }

    public async enterEmail(email: string) {
        const isEmailValid = this.isEmailValid(email);
        if (isEmailValid) {
            this.loginPage.inputEmail(email);
        }
    }

    public enterPassword(password: string) {
        const isValidPassword = this.isPasswordValid(password);
        if (isValidPassword) {
            this.loginPage.inputPassword(password);
        }
    }

    private isEmailValid(email: string) {
        return validator.isEmail(email);
    }

    private isPasswordValid(password: string) {
        return (
            password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /\d/.test(password) &&
            /[^A-Za-z0-9]/.test(password)
        );
    }

    public async clickLoginButton() {
        await this.loginPage.clickLogin();
    }

    public verifyLogin() {
        expect(this.homePage.isLogoutLinkDisplayed).toBeTruthy();
    }
}