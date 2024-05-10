import { Locator } from "@playwright/test";
import BaseItemDetailComponent from "../BaseItemDetailComponent.js";

export default abstract class ComputerEssentialComponent extends BaseItemDetailComponent{

    private defaultCheckboxSel: string = "input[type='checkbox'][checked]"

    protected constructor(component: Locator) {
       super(component)
    }

    public abstract selectProcessor(processorType: string): Promise<string>
    public abstract selectRAM(ramType: string): Promise<string>

    public async unselectDefaultCheckbox(): Promise<void> {
        const defaultCheckboxElemList = await this.component.locator(this.defaultCheckboxSel).all()
        for (const defaultCheckboxElem of defaultCheckboxElemList) {
            defaultCheckboxElem.click()
        }
    }

    public async selectHDD(HDDType: string): Promise<string> {
        return await this.selectOption(HDDType)
    }

    public async selectOS(osType: string): Promise<string> {
        return await this.selectOption(osType)
    }

    public async selectSoftware(softwareType: string): Promise<string> {
        return await this.selectOption(softwareType)
    }

    protected async selectOption(type: string): Promise<string> {
        const optionSel = `//label[contains(text(), "${type}")]`
        const optionList: Locator[] = await this.component.locator(optionSel).all()
        const FIRST_OPTION_INDEX = 0;
        const optionElem = optionList[FIRST_OPTION_INDEX];
        const optionText = await optionElem.textContent() ?? '';
        await optionElem.click();
        return optionText;
    }
}