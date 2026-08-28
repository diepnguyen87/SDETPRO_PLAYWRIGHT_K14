import { Page, TestInfo } from "@playwright/test";
import BasePage from "./BasePage.js";
import LoginComponent from "../components/LoginComponent.js";

export default class LoginPage extends BasePage {
    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo);
    }

    loginComp(): LoginComponent {
        return new LoginComponent(this.page, this.page.locator(LoginComponent.selectorValue), this.testInfo);
    }
}
