import { Locator, Page, TestInfo } from "@playwright/test";
import ComputerEssentialComponent from "../components/computer/ComputerEssentialComponent.js";
import BasePage from "./BasePage.js";

export type ComputerComponentConstructor<T extends ComputerEssentialComponent> = new (page: Page, component: Locator, testInfo: TestInfo) => T

export default class ComputerDetailPage extends BasePage {

    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo)
    }
    computerComponent<T extends ComputerEssentialComponent>(
        computerComponentClass: ComputerComponentConstructor<T>): T {
        return new computerComponentClass(this.page, this.page.locator(computerComponentClass.selectorValue), this.testInfo)
    }
}