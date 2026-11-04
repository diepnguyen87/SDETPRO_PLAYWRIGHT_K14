import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../../SelectorDecorator.js";
import FooterColumnComponent from "./FooterColumnComponent.js";

@selector(".column.information")
export default class InformationColumnComponent extends FooterColumnComponent {

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }
}