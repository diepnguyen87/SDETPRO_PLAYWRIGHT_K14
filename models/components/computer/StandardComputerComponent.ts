import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import ComputerEssentialComponent from "./ComputerEssentialComponent.js";

@selector(".product-essential")
export default class StandardComputerComponent extends ComputerEssentialComponent {

    private dynamicDropdownSel = "//label[contains(text(), 'dynamicText')]/parent::dt/following-sibling::dd[1]/select"
    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async selectProcessorByIndex(processorIndex: number): Promise<string> {
        const selectDropdownSel = this.dropdownSel('Processor')
        await this.withHealing(selectDropdownSel, l => l.selectOption({ index: processorIndex }));
        return await this.getSelectedTextInDropdown(selectDropdownSel)
    }

    public async selectRAMByIndex(ramIndex: number): Promise<string> {
        const selectDropdownSel = this.dropdownSel('RAM')
        await this.withHealing(selectDropdownSel, l => l.selectOption({ index: ramIndex }));
        return await this.getSelectedTextInDropdown(selectDropdownSel)
    }

    private dropdownSel(label: string): string {
        return this.dynamicDropdownSel.replace('dynamicText', label)
    }

    private async getSelectedTextInDropdown(selectDropdownSel: string): Promise<string> {
        const selectedText = await this.withHealing(selectDropdownSel,
            l => l.evaluate(el => (el as HTMLSelectElement).selectedOptions[0]?.text));
        if (selectedText === undefined) {
            throw new Error("No selected option found in dropdown");
        }
        return selectedText.trim();
    }

    public async selectProcessorByName(processorType: string): Promise<string> {
        return this.selectOptionInDropdownByText(this.dropdownSel('Processor'), processorType);
    }

    public async selectRAMByName(ramType: string): Promise<string> {
        return this.selectOptionInDropdownByText(this.dropdownSel('RAM'), ramType);
    }

    private async selectOptionInDropdownByText(selectDropdownSel: string, expectedPartialOptionText: string): Promise<string> {
        const allOptionTextList: string[] = await this.withHealing(selectDropdownSel,
            l => l.evaluate(el => Array.from((el as HTMLSelectElement).options, option => option.textContent ?? '')));
        const optionText = allOptionTextList
            .map(rawOptionText => rawOptionText.trim().replace(/\s+/g, ' '))
            .find(text => text.startsWith(expectedPartialOptionText));
        if (optionText === undefined) {
            throw new Error(`No option starts with "${expectedPartialOptionText}" in dropdown ${selectDropdownSel}`);
        }
        await this.withHealing(selectDropdownSel, l => l.selectOption({ label: optionText }));
        return optionText;
    }
}