import { Locator, Page, TestInfo } from "@playwright/test"
import FooterColumnComponent from "./FooterColumnComponent.js"

export default class MyAccountColumnComponent extends FooterColumnComponent {
    public static selector: string = ".column.my-account"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }
}