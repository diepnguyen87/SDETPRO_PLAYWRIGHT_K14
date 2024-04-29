import { Locator, Page } from "@playwright/test";
import ComputerEssentialComponent from "../components/computer/ComputerEssentialComponent";
import BasePage from "./BasePage";

type ComputerComponentConstructor<T extends ComputerEssentialComponent> = new (component: Locator) => T
export default class ComputerDetailPage extends BasePage{

    constructor(page: Page) {
        super(page)
    }

    computerComponent<T extends ComputerEssentialComponent>(
        computerComponentClass: ComputerComponentConstructor<T>): T {
        return new computerComponentClass(this.page.locator(computerComponentClass.selectorValue))
    }
}