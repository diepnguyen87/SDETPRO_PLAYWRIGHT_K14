import { Locator, Page, TestInfo } from "@playwright/test";
import FooterColumnComponent from "./FooterColumnComponent.js";

export default class CustomerServiceColumnComponent extends FooterColumnComponent {
    public static selector: string = ".column.customer-service"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }
}