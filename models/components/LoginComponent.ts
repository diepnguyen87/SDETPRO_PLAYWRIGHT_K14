import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "./SelectorDecorator.js";
import Component from "./Component.js";

@selector(".login-page")
export default class LoginComponent extends Component {

    private summaryErrorMsgSel: string = "div.message-error"
    private emailValidationSel: string = "span.field-validation-error"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo);
    }

    public async inputEmail(email: string): Promise<void> {
        await this.componentLocator.getByLabel('Email:').fill(email);
    }

    public async inputPassword(password: string): Promise<void> {
        await this.componentLocator.getByLabel('Password:').fill(password);
    }

    public async clickLoginBtn(): Promise<void> {
        await this.componentLocator.getByRole('button', { name: 'Log in' }).click();
    }

    public async getSummaryError(): Promise<string | null> {
        return await this.componentLocator.locator(this.summaryErrorMsgSel).textContent();
    }

    public async getEmailValidationError(): Promise<string | null> {
        return await this.componentLocator.locator(this.emailValidationSel).textContent();
    }
}
