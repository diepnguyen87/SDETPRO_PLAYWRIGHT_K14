import Component from "../Component.js";

export default abstract class CheckoutStepComponent extends Component {

    protected abstract continueBtnSel: string

    public async clickOnContinueBtn(): Promise<void> {
        await this.withHealing(this.continueBtnSel, l => l.click());
        await this.withHealing(this.continueBtnSel, l => l.waitFor({ state: "hidden" }));
    }
}
