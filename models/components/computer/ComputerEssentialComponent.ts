import { Locator, Page, TestInfo } from "@playwright/test";
import BaseItemDetailComponent from "../BaseItemDetailComponent.js";

export default abstract class ComputerEssentialComponent extends BaseItemDetailComponent {

    private allCheckboxSel: string = "input[type='checkbox']"
    private optionLabelSel: string = "//label[contains(text(), \"dynamicText\")]"
    private sectionOptionSel: string = "(//label[contains(text(),'dynamicSection')]/parent::dt/following-sibling::dd[1]//label)[dynamicIndex]"

    protected constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public abstract selectProcessorByIndex(processorIndex: number): Promise<string>
    public abstract selectRAMByIndex(ramIndex: number): Promise<string>
    public abstract selectProcessorByName(processorType: string): Promise<string>
    public abstract selectRAMByName(ramType: string): Promise<string>

    public async unselectDefaultCheckbox(): Promise<void> {
        const allCheckboxElemList = await this.componentLocator.locator(this.allCheckboxSel).all();
        for (let i = 0; i < allCheckboxElemList.length; i++) {
            const isChecked = await allCheckboxElemList[i].evaluate(el => (el as HTMLInputElement).checked);
            if (isChecked) {
                await this.withHealing(this.allCheckboxSel, l => l.nth(i).click());
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

    public async unselectSoftwareByName(softwareType: string): Promise<void> {
        await this.unselectOptionByName(softwareType)
    }

    protected async selectOptionByName(type: string): Promise<string> {
        const optionSel = this.optionLabelSel.replace('dynamicText', type);
        const optionText = await this.withHealing(optionSel, l => l.first().textContent()) ?? '';
        await this.withHealing(optionSel, l => l.first().click());
        return optionText;
    }

    protected async unselectOptionByName(type: string): Promise<void> {
        const optionSel = this.optionLabelSel.replace('dynamicText', type);
        if (await this.withHealing(optionSel, l => l.first().isChecked())) {
            await this.withHealing(optionSel, l => l.first().click());
        }
    }

    protected async selectOptionByIndex(sectionName: string, index: number): Promise<string> {
        const optionSel = this.sectionOptionSel
            .replace('dynamicSection', sectionName)
            .replace('dynamicIndex', String(index + 1));
        const optionText = await this.withHealing(optionSel, l => l.textContent()) ?? '';
        await this.withHealing(optionSel, l => l.click());
        return optionText;
    }
}