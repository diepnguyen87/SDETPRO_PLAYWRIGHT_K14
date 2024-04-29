import { Locator } from "@playwright/test";
import ComputerEssentialComponent from "./ComputerEssentialComponent.js";
import { selector } from "../SelectorDecortor.js";

@selector(".product-essential")
export default class CheapComputerComponent extends ComputerEssentialComponent {

    constructor(component: Locator) {
        super(component)
    }

    public selectProcessor(processorType: string): Promise<void> {
        console.log(".product-essential | CheapComputerComponent");
        return Promise.resolve(undefined);;
    }

    public selectRAM(ramType: string): Promise<void> {
        return Promise.resolve(undefined);
    }

}