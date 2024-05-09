import { Locator } from "@playwright/test";
import ComputerEssentialComponent from "./ComputerEssentialComponent.js";
import { selector } from "../SelectorDecortor.js";

@selector(".product-essential")
export default class CheapComputerComponent extends ComputerEssentialComponent {

    constructor(component: Locator) {
        super(component)
    }

    public async selectProcessor(processorType: string): Promise<void> {
        await this.selectOption(processorType);
    }

    public async selectRAM(ramType: string): Promise<void> {
        await this.selectOption(ramType);
    }

}