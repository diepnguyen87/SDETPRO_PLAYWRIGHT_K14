import { Page, TestInfo } from "@playwright/test";
import CompletedComponent from "../components/checkout/CompletedComponent.js";
import BasePage from "./BasePage.js";

export default class CheckoutCompletedPage extends BasePage {

    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo)
    }

    public async orderCompletedComp(): Promise<CompletedComponent> {
        await this.ensureLoaded()
        return new CompletedComponent(this.page, this.page.locator(CompletedComponent.selectorValue), this.testInfo)
    }
}
