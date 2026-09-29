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
        await this.withHealing(sel, l => l.click());
    }

    public async inputFirstName(value: string): Promise<void> {
        await this.withHealing(this.firstNameSel, l => l.fill(value));
    }

    public async inputLastName(value: string): Promise<void> {
        await this.withHealing(this.lastNameSel, l => l.fill(value));
    }

    public async inputEmail(value: string): Promise<void> {
        await this.withHealing(this.emailSel, l => l.fill(value));
    }

    public async inputPassword(value: string): Promise<void> {
        await this.withHealing(this.passwordSel, l => l.fill(value));
    }

    public async inputConfirmPassword(value: string): Promise<void> {
        await this.withHealing(this.confirmPasswordSel, l => l.fill(value));
    }

    public async clickRegisterBtn(): Promise<void> {
        await this.withHealing(this.registerBtnSel, l => l.click());
    }

    public async getFirstNameValidationError(): Promise<string | null> {
        return await this.withHealing(this.firstNameErrorSel, l => l.textContent());
    }

    public async getLastNameValidationError(): Promise<string | null> {
        return await this.withHealing(this.lastNameErrorSel, l => l.textContent());
    }

    public async getEmailValidationError(): Promise<string | null> {
        return await this.withHealing(this.emailErrorSel, l => l.textContent());
    }

    public async getPasswordValidationError(): Promise<string | null> {
        return await this.withHealing(this.passwordErrorSel, l => l.textContent());
    }

    public async getConfirmPasswordValidationError(): Promise<string | null> {
        return await this.withHealing(this.confirmPasswordErrorSel, l => l.textContent());
    }

    public async getSummaryError(): Promise<string | null> {
        return await this.withHealing(this.summaryErrorSel, l => l.textContent());
    }
}