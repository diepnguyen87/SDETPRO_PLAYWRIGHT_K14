import { Locator } from "@playwright/test";

export default abstract class ComputerEssentialComponent {

    protected constructor(private component: Locator) {
        this.component = component
    }

    protected abstract selectProcessor(processorType: string): Promise<void>
    protected abstract selectRAM(ramType: string): Promise<void>

}