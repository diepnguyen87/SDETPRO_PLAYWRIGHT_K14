import { Locator } from "@playwright/test";
import { selector } from "../SelectorDecortor.js";
import ComputerEssentialComponent from "./ComputerEssentialComponent.js";

@selector(".product-essential")
export default class StandardComputerComponent extends ComputerEssentialComponent {

    constructor(component: Locator) {
        super(component)
    }

    public async selectProcessor(processorType: string): Promise<string> {
        const dropdownLocator = this.component.locator("//label[contains(text(), 'Processor')]/parent::dt/following-sibling::dd[1]/select");
        return this.selectOptionInDropdownByText(dropdownLocator, processorType);
    }

    public async selectRAM(ramType: string): Promise<string> {
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

    private async selectOptionInDropdownByIndex(selectDropdown: Locator, expectedPartialOptionText: string): Promise<string> {
        const allOptionsLocator: Locator[] = await selectDropdown.locator("option").all();
        let optionIndex = undefined;
        let optionText = '';
        for (const option of allOptionsLocator) {
            optionText = await option.textContent() ?? ''
            if (optionText.startsWith(expectedPartialOptionText)) {
                optionIndex = allOptionsLocator.indexOf(option)
                selectDropdown.selectOption({ index: optionIndex });
                break;
            }
        }
        if (optionIndex === undefined) {
            throw new Error(`No option matches with ${expectedPartialOptionText}`);

        }
        return optionText;
    }
}