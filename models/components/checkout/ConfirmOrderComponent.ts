import { Locator } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import TotalComponent from "../cart/TotalComponent.js";
import CheckoutComponent from "./CheckoutComponent.js";

@selector("#opc-confirm_order")
export default class ConfirmOrderComponent extends CheckoutComponent {

    private confirmBtnSel = "input[value='Confirm']"

    constructor(component: Locator) {
        super(component)
        this.component.scrollIntoViewIfNeeded()
    }

    public async clickOnConfirmBtn(): Promise<void> {
        await this.component.locator(this.confirmBtnSel).click()
    }

    public totalComp(): TotalComponent {
        return new TotalComponent(this.component.locator(TotalComponent.selectorValue))
    }
}