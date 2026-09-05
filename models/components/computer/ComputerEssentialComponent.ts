import { Locator, Page, TestInfo } from "@playwright/test";
import BaseItemDetailComponent from "../BaseItemDetailComponent.js";

export default abstract class ComputerEssentialComponent extends BaseItemDetailComponent {

    private allCheckboxSel: string = "input[type='checkbox']"

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
        const optionSel = `//label[contains(text(), "${type}")]`;
        const optionText = await this.componentLocator.locator(optionSel).first().textContent() ?? '';
        await this.withHealing(optionSel, l => l.first().click());
        return optionText;
    }

    protected async unselectOptionByName(type: string): Promise<void> {
        const optionSel = `//label[contains(text(), "${type}")]`;
        const optionElem = this.componentLocator.locator(optionSel).first();
        if (await optionElem.isChecked()) {
            await this.withHealing(optionSel, l => l.first().click());
        }
    }

    protected async selectOptionByIndex(sectionName: string, index: number): Promise<string> {
        const optionSel = `(//label[contains(text(),'${sectionName}')]/parent::dt/following-sibling::dd[1]//label)[${index + 1}]`;
        const optionText = await this.componentLocator.locator(optionSel).textContent() ?? '';
        await this.withHealing(optionSel, l => l.click());
        return optionText;
    }
}