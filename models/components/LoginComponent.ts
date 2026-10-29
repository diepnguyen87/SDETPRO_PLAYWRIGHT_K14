import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "./SelectorDecorator.js";
import Component from "./Component.js";

@selector(".login-page")
export default class LoginComponent extends Component {

    private summaryErrorMsgSel: string = "div.message-error"
    private emailValidationSel: string = "span.field-validation-error"
    private loginErrorSel: string = `${this.summaryErrorMsgSel}, ${this.emailValidationSel}`

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
        // Successful login leaves the login page; failed login keeps it and shows an error
        await Promise.race([
            this.componentLocator.waitFor({ state: 'hidden' }),
            this.componentLocator.locator(this.loginErrorSel).filter({ visible: true }).first().waitFor({ state: 'visible' })
        ]);
    }

    public async getSummaryError(): Promise<string | null> {
        return await this.withHealing(this.summaryErrorMsgSel, l => l.textContent());
    }

    public async getEmailValidationError(): Promise<string | null> {
        return await this.withHealing(this.emailValidationSel, l => l.textContent());
    }
}
