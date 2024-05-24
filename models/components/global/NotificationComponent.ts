import { Locator } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";

@selector("#bar-notification")
export default class NotificationComponent {

    private contentMessageSel: string = "p.content"
    constructor(private component: Locator) {
        this.component = component
    }

    public async getContentMessage(): Promise<string> {
        return await this.component.locator(this.contentMessageSel).textContent() ?? ''
    }
}