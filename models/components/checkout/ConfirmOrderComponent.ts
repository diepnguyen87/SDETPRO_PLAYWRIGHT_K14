import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import TotalComponent from "../cart/TotalComponent.js";
import Component from "../Component.js";

@selector("#opc-confirm_order")
export default class ConfirmOrderComponent extends Component {

    private confirmBtnSel = "input[value='Confirm']"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo);
        componentLocator.scrollIntoViewIfNeeded();
    }

    public async clickOnConfirmBtn(): Promise<void> {
        await this.click(this.confirmBtnSel, this.componentLocator.locator(this.confirmBtnSel));
    }

    public totalComp(): TotalComponent {
        return new TotalComponent(this.page, this.componentLocator.locator(TotalComponent.selectorValue), this.testInfo)
    }
}