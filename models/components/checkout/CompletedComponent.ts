import { expect, Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import Component from "../Component.js";

@selector(".section.order-completed")
export default class CompletedComponent extends Component {

    private readonly titleSel = ".title"
    private readonly orderNumber = "//ul[@class='details']//li[contains(text(), 'Order number')]"
    private readonly orderDetailLinkSel = ".details>li>a"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo);
        // this.componentLocator.scrollIntoViewIfNeeded()
    }

    public async getOrderCompletedTitle(): Promise<string> {
        return await this.componentLocator.locator(this.titleSel).innerText()
    }

    public async getOrderNumber(): Promise<string | null> {
        await expect(this.componentLocator).toBeVisible({
            timeout: 30000
        });
        
        let matchesArr = (await this.componentLocator.getByText("Order number").innerText()).match(/\d+/)
        return matchesArr ? matchesArr[0] : null
    }
 
    public oderDetailLink(): Locator {
        return this.componentLocator.locator(this.orderDetailLinkSel)
    }
}