import { Locator } from "@playwright/test";

export default class CheckoutComponent {

    private continueBtnSel = "input[value='Continue']"

    constructor(protected component: Locator) {
        this.component = component
    }

    public async clickOnContinueBtn(): Promise<void> {
        const continueBtn = this.component.locator(this.continueBtnSel)
        continueBtn.scrollIntoViewIfNeeded()
        await continueBtn.click()
        await continueBtn.waitFor({state: "hidden"})
    }
}