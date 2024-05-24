import { Locator } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import ComputerEssentialComponent from "./ComputerEssentialComponent.js";

@selector(".product-essential")
export default class CheapComputerComponent extends ComputerEssentialComponent {

    constructor(component: Locator) {
        super(component)
    }

    public async selectProcessorByIndex(index: number): Promise<string> {
        return await this.selectOptionByIndex("Processor", index);
    }

    public async selectRAMByIndex(index: number): Promise<string> {
        return await this.selectOptionByIndex("RAM", index);
    }

    public async selectProcessorByName(processorType: string): Promise<string> {
        return await this.selectOptionByName(processorType)
    }

    public async selectRAMByName(ramType: string): Promise<string> {
        return await this.selectOptionByName(ramType)
    }
}