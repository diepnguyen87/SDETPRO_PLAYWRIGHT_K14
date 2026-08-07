import { Locator, Page, TestInfo } from "@playwright/test";
import FooterColumnComponent from "./FooterColumnComponent.js";

export default class InformationColumnComponent extends FooterColumnComponent {
    public static selector: string = ".column.information"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }
}