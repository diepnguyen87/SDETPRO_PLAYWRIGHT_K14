import { Page, TestInfo, expect } from "@playwright/test";
import RegisterPage from "../models/pages/RegisterPage.js";
import BaseFlow from "./BaseFlow.js";
import { RegisterFormData } from "../models/register/RegisterFormData.js";

export default class RegisterTestFlow extends BaseFlow {

    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo);
    }

    public async register(data: RegisterFormData): Promise<void> {
        const registerPage = new RegisterPage(this.page, this.testInfo);
        await registerPage.selectGender(data.gender);
        await registerPage.inputFirstName(data.firstName);
        await registerPage.inputLastName(data.lastName);
        await registerPage.inputEmail(data.email);
        await registerPage.inputPassword(data.password);
        await registerPage.inputConfirmPassword(data.confirmPassword);
        await registerPage.clickRegisterBtn();
    }

    public async verifyRegisterSuccess(): Promise<void> {
        await expect(this.page).toHaveURL(/registerresult/);
    }

    public async verifyMissingFirstNameValidationError(): Promise<void> {
        const registerPage = new RegisterPage(this.page, this.testInfo);
        const error = await registerPage.getFirstNameValidationError();
        expect(error).not.toBeNull();
        expect(error!.trim()).toBe('First name is required.');
    }

    public async verifyMissingLastNameValidationError(): Promise<void> {
        const registerPage = new RegisterPage(this.page, this.testInfo);
        const error = await registerPage.getLastNameValidationError();
        expect(error).not.toBeNull();
        expect(error!.trim()).toBe('Last name is required.');
    }

    public async verifyMissingEmailValidationError(): Promise<void> {
        const registerPage = new RegisterPage(this.page, this.testInfo);
        const error = await registerPage.getEmailValidationError();
        expect(error).not.toBeNull();
        expect(error!.trim()).toBe('Email is required.');
    }

    public async verifyMissingPasswordValidationError(): Promise<void> {
        const registerPage = new RegisterPage(this.page, this.testInfo);
        const error = await registerPage.getPasswordValidationError();
        expect(error).not.toBeNull();
        expect(error!.trim()).toBe('Password is required.');
    }

    public async verifyMissingConfirmPasswordValidationError(): Promise<void> {
        const registerPage = new RegisterPage(this.page, this.testInfo);
        const error = await registerPage.getConfirmPasswordValidationError();
        expect(error).not.toBeNull();
        expect(error!.trim()).toBe('Password is required.');
    }

    public async verifyInvalidEmailFormatValidationError(): Promise<void> {
        const registerPage = new RegisterPage(this.page, this.testInfo);
        const error = await registerPage.getEmailValidationError();
        expect(error).not.toBeNull();
        expect(error!.trim()).toBe('Wrong email');
    }

    public async verifyConfirmPasswordMismatchValidationError(): Promise<void> {
        const registerPage = new RegisterPage(this.page, this.testInfo);
        const error = await registerPage.getConfirmPasswordValidationError();
        expect(error).not.toBeNull();
        expect(error!.trim()).toBe('The password and confirmation password do not match.');
    }

    public async verifyPasswordTooShortValidationError(): Promise<void> {
        const registerPage = new RegisterPage(this.page, this.testInfo);
        const error = await registerPage.getPasswordValidationError();
        expect(error).not.toBeNull();
        expect(error!.trim()).toBe('The password should have at least 6 characters.');
    }

    public async verifyExistingEmailSummaryError(): Promise<void> {
        const registerPage = new RegisterPage(this.page, this.testInfo);
        const error = await registerPage.getSummaryError();
        expect(error).not.toBeNull();
        expect(error!.trim()).toBe('The specified email already exists');
    }
}
