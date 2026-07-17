import { Locator } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import CheckoutComponent from "./CheckoutComponent.js";

@selector("#opc-shipping_method")
export default class ShippingMethodComponent extends CheckoutComponent {

    constructor(component: Locator) {
        super(component)
        component.scrollIntoViewIfNeeded()
    }

    public async selectMethod(optionIndex: number): Promise<string> {
        const shippingMethodRadioSel = `#shippingoption_${optionIndex}`
        const shippingMethodLabelSel = `label[for='shippingoption_${optionIndex}']`

        await this.component.locator(shippingMethodRadioSel).click()
        return await this.component.locator(shippingMethodLabelSel).textContent() ?? ''
    }
}