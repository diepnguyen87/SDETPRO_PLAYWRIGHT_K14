import { Locator } from "@playwright/test";
import BaseItemDetailComponent from "../BaseItemDetailComponent.js";

export default abstract class ComputerEssentialComponent extends BaseItemDetailComponent {

    private allCheckboxSel: string = "input[type='checkbox']"

    protected constructor(component: Locator) {
        super(component)
    }

    public abstract selectProcessorByIndex(processorIndex: number): Promise<string>
    public abstract selectRAMByIndex(ramIndex: number): Promise<string>
    public abstract selectProcessorByName(processorType: string): Promise<string>
    public abstract selectRAMByName(ramType: string): Promise<string>

    public async unselectDefaultCheckbox(): Promise<void> {
        const allCheckboxElemList = await this.component.locator(this.allCheckboxSel).all()
        for (const checkboxElem of allCheckboxElemList) {
            const isChecked = await checkboxElem.evaluate(el => (el as HTMLInputElement).checked);
            if (isChecked) {
                checkboxElem.click()
            }
        }
    }

    public async selectHDDByIndex(index: number): Promise<string> {
        return await this.selectOptionByIndex("HDD", index)
    }

    public async selectOSByIndex(index: number): Promise<string> {
        return await this.selectOptionByIndex("OS", index)
    }

    public async selectSoftwareByIndex(index: number): Promise<string> {
        return await this.selectOptionByIndex("Software", index)
    }

    public async selectHDDByName(HDDType: string): Promise<string> {
        return await this.selectOptionByName(HDDType)
    }

    public async selectOSByName(osType: string): Promise<string> {
        return await this.selectOptionByName(osType)
    }

    public async selectSoftwareByName(softwareType: string): Promise<string> {
        return await this.selectOptionByName(softwareType)
    }

    protected async selectOptionByName(type: string): Promise<string> {
        const optionSel = `//label[contains(text(), "${type}")]`
        const optionList: Locator[] = await this.component.locator(optionSel).all()
        const FIRST_OPTION_INDEX = 0;
        const optionElem = optionList[FIRST_OPTION_INDEX];
        const optionText = await optionElem.textContent() ?? '';
        await optionElem.click();
        return optionText;
    }

    protected async selectOptionByIndex(sectionName: string, index: number): Promise<string> {
        const optionSel = `(//label[contains(text(),'${sectionName}')]/parent::dt/following-sibling::dd[1]//input)[${index}]`
        const optionElem = this.component.locator(optionSel)
        const optionText = await optionElem.textContent() ?? '';
        await optionElem.click();
        return optionText;
    }
}