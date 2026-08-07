import { Page, TestInfo } from "@playwright/test";
import BasePage from "./BasePage.js";

export default class GiftCardPage extends BasePage {
    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo)
    }
}