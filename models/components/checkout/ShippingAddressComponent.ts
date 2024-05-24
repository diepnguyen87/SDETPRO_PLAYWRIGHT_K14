import { Locator } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import CheckoutComponent from "./CheckoutComponent.js";

@selector("#opc-shipping")
export default class ShippingAddressComponent extends CheckoutComponent {

    constructor(component: Locator) {
        super(component)
    }
}