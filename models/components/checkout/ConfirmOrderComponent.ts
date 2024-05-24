import { Locator } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import CheckoutComponent from "./CheckoutComponent.js";

@selector("#opc-confirm_order")
export default class ConfirmOrderComponent extends CheckoutComponent {
    
    constructor(component: Locator) {
       super(component)
    }
}