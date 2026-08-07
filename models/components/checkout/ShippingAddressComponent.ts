import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import Component from "../Component.js";

@selector("#opc-shipping")
export default class ShippingAddressComponent extends Component {

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo);
        this.componentLocator.scrollIntoViewIfNeeded()
    }
}