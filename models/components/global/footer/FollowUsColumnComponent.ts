import { Locator, Page, TestInfo } from "@playwright/test";
import FooterColumnComponent from "./FooterColumnComponent.js";

export default class FollowUsColumnComponent extends FooterColumnComponent {
    public static selector: string = ".column.follow-us"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }
}