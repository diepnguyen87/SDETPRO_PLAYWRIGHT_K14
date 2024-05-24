import { Locator } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import CheckoutComponent from "./CheckoutComponent.js";

@selector("#opc-payment_method")
export default class PaymentMethodComponent extends CheckoutComponent {

    constructor(component: Locator) {
        super(component)
    }
}