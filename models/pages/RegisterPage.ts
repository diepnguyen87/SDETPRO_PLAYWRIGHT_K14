import { Page, TestInfo } from "@playwright/test";
import BasePage from "./BasePage.js";

export default class RegisterPage extends BasePage {

    private genderMaleSel             = "#gender-male"
    private genderFemaleSel           = "#gender-female"
    private firstNameSel              = "#FirstName"
    private lastNameSel               = "#LastName"
    private emailSel                  = "#Email"
    private passwordSel               = "#Password"
    private confirmPasswordSel        = "#ConfirmPassword"
    private registerBtnSel            = "#register-button"

    private firstNameErrorSel         = "span[data-valmsg-for='FirstName']"
    private lastNameErrorSel          = "span[data-valmsg-for='LastName']"
    private emailErrorSel             = "span[data-valmsg-for='Email']"
    private passwordErrorSel          = "span[data-valmsg-for='Password']"
    private confirmPasswordErrorSel   = "span[data-valmsg-for='ConfirmPassword']"
    private summaryErrorSel           = "div.validation-summary-errors"

    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo)
    }

    public async selectGender(gender: string): Promise<void> {
        if (gender !== 'male' && gender !== 'female') {
            throw new Error(`Invalid gender value: "${gender}". Accepted values: "male" or "female".`);
        }
        const sel = gender === 'male' ? this.genderMaleSel : this.genderFemaleSel;
        await this.page.locator(sel).click();
    }

    public async inputFirstName(value: string): Promise<void> {
        await this.page.locator(this.firstNameSel).fill(value);
    }

    public async inputLastName(value: string): Promise<void> {
        await this.page.locator(this.lastNameSel).fill(value);
    }

    public async inputEmail(value: string): Promise<void> {
        await this.page.locator(this.emailSel).fill(value);
    }

    public async inputPassword(value: string): Promise<void> {
        await this.page.locator(this.passwordSel).fill(value);
    }

    public async inputConfirmPassword(value: string): Promise<void> {
        await this.page.locator(this.confirmPasswordSel).fill(value);
    }

    public async clickRegisterBtn(): Promise<void> {
        await this.page.locator(this.registerBtnSel).click();
    }

    public async getFirstNameValidationError(): Promise<string | null> {
        return await this.page.locator(this.firstNameErrorSel).textContent();
    }

    public async getLastNameValidationError(): Promise<string | null> {
        return await this.page.locator(this.lastNameErrorSel).textContent();
    }

    public async getEmailValidationError(): Promise<string | null> {
        return await this.page.locator(this.emailErrorSel).textContent();
    }

    public async getPasswordValidationError(): Promise<string | null> {
        return await this.page.locator(this.passwordErrorSel).textContent();
    }

    public async getConfirmPasswordValidationError(): Promise<string | null> {
        return await this.page.locator(this.confirmPasswordErrorSel).textContent();
    }

    public async getSummaryError(): Promise<string | null> {
        return await this.page.locator(this.summaryErrorSel).textContent();
    }
}