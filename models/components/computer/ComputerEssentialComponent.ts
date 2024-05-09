import { Locator } from "@playwright/test";

export default abstract class ComputerEssentialComponent {

    protected constructor(protected component: Locator) {
        this.component = component
    }

    public abstract selectProcessor(processorType: string): Promise<void>
    public abstract selectRAM(ramType: string): Promise<void>
    
    public async selectHDD(HDDType: string): Promise<void> {
        await this.selectOption(HDDType)
    }

    public async selectOS(osType: string): Promise<void> {
        await this.selectOption(osType)
    }

    public async selectSoftware(softwareType: string): Promise<void> {
        await this.selectOption(softwareType)
    }

    protected async selectOption(type: string) {
        const optionLocator = `//label[contains(text(), "${type}")]`
        const optionList: Locator[] = await this.component.locator(optionLocator).all()
        const FIRST_OPTION_INDEX = 0;
        await optionList[FIRST_OPTION_INDEX].click();
    }
}