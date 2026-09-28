import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import CheckoutStepComponent from "./CheckoutStepComponent.js";

@selector("#opc-shipping")
export default class ShippingAddressComponent extends CheckoutStepComponent {

    protected continueBtnSel = "input[value='Continue']"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo);
        this.componentLocator.scrollIntoViewIfNeeded()
    }
}