import { Locator, Page, TestInfo } from "@playwright/test"
import { selector } from "../../SelectorDecorator.js"
import FooterColumnComponent from "./FooterColumnComponent.js"

@selector(".column.my-account")
export default class MyAccountColumnComponent extends FooterColumnComponent {

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }
}