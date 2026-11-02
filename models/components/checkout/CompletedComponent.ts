import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import Component from "../Component.js";

@selector(".section.order-completed")
export default class CompletedComponent extends Component {

    private readonly titleSel = ".title"
    private readonly orderNumberSel = ".details>li:has-text('Order number')"
    private readonly orderDetailLinkSel = ".details>li>a"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo);
    }

    public async getOrderCompletedTitle(): Promise<string> {
        return await this.withHealing(this.titleSel, l => l.innerText())
    }

    public async getOrderNumber(): Promise<string | null> {
        const orderNumberText = await this.withHealing(this.orderNumberSel, l => l.innerText())
        const matchesArr = orderNumberText.match(/\d+/)
        return matchesArr ? matchesArr[0] : null
    }

    public async clickOrderDetailsLink(): Promise<void> {
        await this.withHealing(this.orderDetailLinkSel, l => l.click())
    }
 
    public oderDetailLink(): Locator {
        return this.componentLocator.locator(this.orderDetailLinkSel)
    }
}