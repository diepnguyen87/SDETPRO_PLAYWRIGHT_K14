import Component from "../Component.js";

export default abstract class CheckoutStepComponent extends Component {

    protected abstract continueBtnSel: string

    public async clickOnContinueBtn(): Promise<void> {
        await this.componentLocator.locator(this.continueBtnSel).scrollIntoViewIfNeeded();
        await this.withHealing(this.continueBtnSel, l => l.click());
        await this.componentLocator.locator(this.continueBtnSel).waitFor({ state: "hidden" });
    }
}
