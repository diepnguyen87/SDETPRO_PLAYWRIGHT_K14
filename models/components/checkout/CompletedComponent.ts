import { Locator } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import CheckoutComponent from "./CheckoutComponent.js";

@selector(".section.order-completed")
export default class CompletedComponent extends CheckoutComponent {

    private readonly titleSel = ".title"
    private readonly orderNumber = "//ul[@class='details']//li[contains(text(), 'Order number')]"
    private readonly orderDetailLinkSel = ".details>li>a"

    constructor(component: Locator) {
        super(component)
        this.component.scrollIntoViewIfNeeded()
    }

    public async getOrderCompletedTitle(): Promise<string> {
        return await this.component.locator(this.titleSel).innerText()
    }

    public async getOrderNumber(): Promise<string | null> {
        let matchesArr = (await this.component.locator(this.orderNumber).innerText()).match(/\d+/)
        return matchesArr ? matchesArr[0] : null
    }

    public oderDetailLink(): Locator {
        return this.component.locator(this.orderDetailLinkSel)
    }
}