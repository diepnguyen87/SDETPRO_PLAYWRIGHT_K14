import { Locator } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import ComputerEssentialComponent from "./ComputerEssentialComponent.js";

@selector(".product-essential")
export default class StandardComputerComponent extends ComputerEssentialComponent {

    private dynamicDropdownSel = "//label[contains(text(), 'dynamicText')]/parent::dt/following-sibling::dd[1]/select"
    constructor(component: Locator) {
        super(component)
    }

    public async selectProcessorByIndex(processorIndex: number): Promise<string> {
        if (processorIndex === undefined) {
            throw new Error(`${processorIndex} does not exist`);
        }
        const selectDropdownLocator = this.component.locator(this.dynamicDropdownSel.replace('dynamicText', 'Processor'))
        selectDropdownLocator.selectOption({ index: processorIndex });
        return await this.getSelectedTextInDropdown(selectDropdownLocator)
    }

    public async selectRAMByIndex(ramIndex: number): Promise<string> {
        if (ramIndex === undefined) {
            throw new Error(`${ramIndex} does not exist`);
        }
        const selectDropdownLocator = this.component.locator("//label[contains(text(), 'RAM')]/parent::dt/following-sibling::dd[1]/select");
        selectDropdownLocator.selectOption({ index: ramIndex });
        return await this.getSelectedTextInDropdown(selectDropdownLocator)
    }

    private async getSelectedTextInDropdown(selectDropdown: Locator): Promise<string> {
        const allSelectedElemList = await selectDropdown.locator('option').all()
        let selectedRAMText = undefined
        for (const selectElem of allSelectedElemList) {
            const isSelected = await selectElem.evaluate(el => (el as HTMLInputElement).selected);
            if (isSelected) {
                selectedRAMText = await selectElem.evaluate(el => (el as HTMLInputElement).innerText);
                break;
            }
        }
        return selectedRAMText.trim();
    }

    public async selectProcessorByName(processorType: string): Promise<string> {
        const dropdownLocator = this.component.locator("//label[contains(text(), 'Processor')]/parent::dt/following-sibling::dd[1]/select");
        return this.selectOptionInDropdownByText(dropdownLocator, processorType);
    }

    public async selectRAMByName(ramType: string): Promise<string> {
        const dropdownLocator = this.component.locator("//label[contains(text(), 'RAM')]/parent::dt/following-sibling::dd[1]/select");
        return this.selectOptionInDropdownByText(dropdownLocator, ramType);
    }

    private async selectOptionInDropdownByText(selectDropdown: Locator, expectedPartialOptionText: string): Promise<string> {
        const allOptionsLocator: Locator[] = await selectDropdown.locator("option").all();
        let optionText = '';
        for (const option of allOptionsLocator) {
            optionText = await option.textContent() ?? ''
            optionText = optionText.trim().replace(/\s+/g, ' ')

            if (optionText.startsWith(expectedPartialOptionText)) {
                selectDropdown.selectOption({ label: optionText })
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