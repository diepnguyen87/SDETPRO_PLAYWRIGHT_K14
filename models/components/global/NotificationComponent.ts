import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import Component from "../Component.js";

@selector("#bar-notification")
export default class NotificationComponent extends Component {

    private contentMessageSel: string = "p.content"
    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async getContentMessage(): Promise<string> {
        return await this.componentLocator.locator(this.contentMessageSel).textContent() ?? ''
    }
}