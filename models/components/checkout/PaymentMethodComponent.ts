import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import CheckoutStepComponent from "./CheckoutStepComponent.js";

@selector("#opc-payment_method")
export default class PaymentMethodComponent extends CheckoutStepComponent {

    protected continueBtnSel = "input[value='Continue']"

    private cashOnDeliverySel = "input[value='Payments.CashOnDelivery']"
    private checkMoneyOrderSel = "input[value='Payments.CheckMoneyOrder']"
    private creditCardSel = "input[value='Payments.Manual']"
    private purchaseOrderSel = "input[value='Payments.PurchaseOrder']"

    private cashOnDeliveryLabelSel = "input[value='Payments.CashOnDelivery'] + label"
    private checkMoneyOrderLabelSel = "input[value='Payments.CheckMoneyOrder'] + label"
    private creditCardLabelSel = "input[value='Payments.Manual'] + label"
    private purchaseOrderLabelSel = "input[value='Payments.PurchaseOrder'] + label"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo);
    }

    public async selectCashOnDelivery(): Promise<number> {
        const additionalFee = this.getFeeMatchesArr(await this.withHealing(this.cashOnDeliveryLabelSel, l => l.innerText()));
        await this.withHealing(this.cashOnDeliverySel, l => l.click());
        return additionalFee;
    }

    public async selectCheckMoneyOrder(): Promise<number> {
        const additionalFee = this.getFeeMatchesArr(await this.withHealing(this.checkMoneyOrderLabelSel, l => l.innerText()));
        await this.withHealing(this.checkMoneyOrderSel, l => l.click());
        return additionalFee;
    }

    public async selectCreditCard(): Promise<number> {
        const additionalFee = this.getFeeMatchesArr(await this.withHealing(this.creditCardLabelSel, l => l.innerText()));
        await this.withHealing(this.creditCardSel, l => l.click());
        return additionalFee;
    }

    public async selectPurchaseOrder(): Promise<number> {
        const additionalFee = this.getFeeMatchesArr(await this.withHealing(this.purchaseOrderLabelSel, l => l.innerText()));
        await this.withHealing(this.purchaseOrderSel, l => l.click());
        return additionalFee;
    }

    private getFeeMatchesArr(searchStr: string) {
        let feeMatchesArr = searchStr.match(/\d+\.\d{2}/)
        return feeMatchesArr ? Number(feeMatchesArr[0]) : 0
    }
}