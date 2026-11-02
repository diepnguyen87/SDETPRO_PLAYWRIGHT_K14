import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import CheckoutStepComponent from "./CheckoutStepComponent.js";

@selector("#opc-shipping_method")
export default class ShippingMethodComponent extends CheckoutStepComponent {

    protected continueBtnSel = "input[value='Continue']"
    private shippingMethodRadioSel = "#shippingoption_dynamicIndex"
    private shippingMethodLabelSel = "label[for='shippingoption_dynamicIndex']"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo);
    }

    public async selectMethod(optionIndex: number): Promise<string> {
        const radioSel = this.shippingMethodRadioSel.replace('dynamicIndex', String(optionIndex));
        const labelSel = this.shippingMethodLabelSel.replace('dynamicIndex', String(optionIndex));

        await this.withHealing(radioSel, l => l.click());
        return await this.withHealing(labelSel, l => l.textContent()) ?? '';
    }
}