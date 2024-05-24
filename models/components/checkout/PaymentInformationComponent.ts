import { Locator } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import CheckoutComponent from "./CheckoutComponent.js";

@selector("#opc-payment_info")
export default class PaymentInformationComponent extends CheckoutComponent{

    constructor(component: Locator) {
        super(component)
    }
}