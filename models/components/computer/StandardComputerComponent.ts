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
        const selectDropdownSel = this.dynamicDropdownSel.replace('dynamicText', 'Processor')
        await this.withHealing(selectDropdownSel, l => l.selectOption({ index: processorIndex }));
        return await this.getSelectedTextInDropdown(this.componentLocator.locator(selectDropdownSel))
    }

    public async selectRAMByIndex(ramIndex: number): Promise<string> {
        if (ramIndex === undefined) {
            throw new Error(`${ramIndex} does not exist`);
        }
        const selectDropdownSel = "//label[contains(text(), 'RAM')]/parent::dt/following-sibling::dd[1]/select"
        await this.withHealing(selectDropdownSel, l => l.selectOption({ index: ramIndex }));
        return await this.getSelectedTextInDropdown(this.componentLocator.locator(selectDropdownSel))
    }

    private async getSelectedTextInDropdown(selectDropdown: Locator): Promise<string> {
        const allSelectedElemList = await selectDropdown.locator('option').all()
        let selectedRAMText: string | undefined = undefined
        for (const selectElem of allSelectedElemList) {
            const isSelected = await selectElem.evaluate(el => (el as HTMLOptionElement).selected);
            if (isSelected) {
                selectedRAMText = await selectElem.evaluate(el => (el as HTMLInputElement).innerText);
                break;
            }
        }
        if (selectedRAMText === undefined) {
            throw new Error("No selected option found in dropdown");
        }
        return selectedRAMText.trim();
    }

    public async selectProcessorByName(processorType: string): Promise<string> {
        const dropdownSel = "//label[contains(text(), 'Processor')]/parent::dt/following-sibling::dd[1]/select";
        return this.selectOptionInDropdownByText(dropdownSel, processorType);
    }

    public async selectRAMByName(ramType: string): Promise<string> {
        const dropdownSel = "//label[contains(text(), 'RAM')]/parent::dt/following-sibling::dd[1]/select";
        return this.selectOptionInDropdownByText(dropdownSel, ramType);
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