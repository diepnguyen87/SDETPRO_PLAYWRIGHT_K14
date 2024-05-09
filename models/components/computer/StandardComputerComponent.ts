import { Locator } from "@playwright/test";
import ComputerEssentialComponent from "./ComputerEssentialComponent.js";
import { selector } from "../SelectorDecortor.js";

@selector(".product-essential")
export default class StandardComputerComponent extends ComputerEssentialComponent {

    constructor(component: Locator) {
        super(component)
    }

    public async selectProcessor(processorType: string): Promise<void> {
        const dropdownLocator = this.component.locator("//label[contains(text(), 'Processor')]/parent::dt/following-sibling::dd[1]/select");
        this.selectOptionInDropdownByText(dropdownLocator, processorType);
    }

    public async selectRAM(ramType: string): Promise<void> {
        const dropdownLocator = this.component.locator("//label[contains(text(), 'RAM')]/parent::dt/following-sibling::dd[1]/select");
        this.selectOptionInDropdownByText(dropdownLocator, ramType);
    }

    private async selectOptionInDropdownByText(selectDropdown: Locator, expectedPartialOptionText: string) {
        const allOptionsLocator: Locator[] = await selectDropdown.locator("option").all();
        for (const option of allOptionsLocator) {
            let optionText = await option.textContent() ?? ''
            optionText = optionText.trim().replace(/\s+/g, ' ')

            if (optionText.startsWith(expectedPartialOptionText)) {
                selectDropdown.selectOption({ label: optionText })
                break;
            }
        }
    }

    private async selectOptionInDropdownByIndex(selectDropdown: Locator, expectedPartialOptionText: string) {
        const allOptionsLocator: Locator[] = await selectDropdown.locator("option").all();
        let optionIndex = 0;
        for (const option of allOptionsLocator) {
            const optionText = await option.textContent() ?? ''
            if (optionText.startsWith(expectedPartialOptionText)) {
                optionIndex = allOptionsLocator.indexOf(option)
                selectDropdown.selectOption({ index: optionIndex });
                break;
            }
        }
    }
}