import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import Component from "../Component.js";

@selector("#bar-notification")
export default class NotificationComponent extends Component {

    private contentMessageSel: string = "p.content"
    private closeBtnSel: string = "span.close"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async getContentMessage(): Promise<string> {
        return await this.withHealing(this.contentMessageSel, l => l.textContent()) ?? ''
    }

    public async close(): Promise<void> {
        await this.withHealing(this.closeBtnSel, l => l.click());
        await this.withHealing(this.contentMessageSel, l => l.waitFor({ state: "hidden" }));
    }
}