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
        if (processorIndex === undefined) {
            throw new Error(`${processorIndex} does not exist`);
        }
        const selectDropdownSel = this.dropdownSel('Processor')
        await this.withHealing(selectDropdownSel, l => l.selectOption({ index: processorIndex }));
        return await this.getSelectedTextInDropdown(selectDropdownSel)
    }

    public async selectRAMByIndex(ramIndex: number): Promise<string> {
        if (ramIndex === undefined) {
            throw new Error(`${ramIndex} does not exist`);
        }
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
        let optionText = '';
        for (const rawOptionText of allOptionTextList) {
            optionText = rawOptionText.trim().replace(/\s+/g, ' ')

            if (optionText.startsWith(expectedPartialOptionText)) {
                await this.withHealing(selectDropdownSel, l => l.selectOption({ label: optionText }));
                break;
            }
        }
        return optionText;
    }

    // private async selectOptionInDropdownByText(selectDropdown: Locator, expectedPartialOptionText: string): Promise<string> {
    //     const allOptionsLocator: Locator[] = await selectDropdown.locator("option").all();
    //     let optionIndex = undefined;
    //     let optionText = '';
    //     for (const option of allOptionsLocator) {
    //         optionText = await option.textContent() ?? ''
    //         if (optionText.startsWith(expectedPartialOptionText)) {
    //             optionIndex = allOptionsLocator.indexOf(option)
    //             selectDropdown.selectOption({ index: optionIndex });
    //             break;
    //         }
    //     }
    //     if (optionIndex === undefined) {
    //         throw new Error(`No option matches with ${expectedPartialOptionText}`);

    //     }
    //     return optionText;
    // }

    private async selectOptionInDropdownByIndex(selectDropdown: Locator, expectedIndex: number): Promise<string> {
        const allOptionsLocator: Locator[] = await selectDropdown.locator("option").all();
        let optionIndex = undefined;
        let optionText = '';
        selectDropdown.selectOption({ index: optionIndex });
        if (optionIndex === undefined) {
            throw new Error(`No option matches with ${expectedIndex}`);

        }
        return optionText;
    }
}