import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import Component from "../Component.js";

@selector("#opc-shipping_method")
export default class ShippingMethodComponent extends Component {

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo);
        componentLocator.scrollIntoViewIfNeeded()
    }

    public async selectMethod(optionIndex: number): Promise<string> {
        const shippingMethodRadioSel = `#shippingoption_${optionIndex}`
        const shippingMethodLabelSel = `label[for='shippingoption_${optionIndex}']`

        await this.componentLocator.locator(shippingMethodRadioSel).click()
        return await this.componentLocator.locator(shippingMethodLabelSel).textContent() ?? ''
    }
}