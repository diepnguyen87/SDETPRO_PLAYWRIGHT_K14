import { Locator } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import CheckoutComponent from "./CheckoutComponent.js";

@selector("#opc-payment_method")
export default class PaymentMethodComponent extends CheckoutComponent {

    private cashOnDeliverySel = "input[value='Payments.CashOnDelivery']"
    private checkMoneyOrderSel = "input[value='Payments.CheckMoneyOrder']"
    private creditCardSel = "input[value='Payments.Manual']"
    private purchaseOrderSel = "input[value='Payments.PurchaseOrder']"

    constructor(component: Locator) {
        super(component)
        this.component.scrollIntoViewIfNeeded()
    }

    public async selectCashOnDelivery(): Promise<number> {
        let additionalFee = this.getFeeMatchesArr(await this.component.locator(this.cashOnDeliverySel).innerText())
        await this.component.locator(this.cashOnDeliverySel).click()
        return additionalFee
    }

    public async selectCheckMoneyOrder(): Promise<number> {
        let additionalFee = this.getFeeMatchesArr(await this.component.locator(this.cashOnDeliverySel).innerText())
        await this.component.locator(this.checkMoneyOrderSel).click()
        return additionalFee
    }

    public async selectCreditCard(): Promise<number> {
        let additionalFee = this.getFeeMatchesArr(await this.component.locator(this.cashOnDeliverySel).innerText())
        await this.component.locator(this.creditCardSel).click()
        return additionalFee
    }

    public async selectPurchaseOrder(): Promise<number> {
        let additionalFee = this.getFeeMatchesArr(await this.component.locator(this.cashOnDeliverySel).innerText())
        await this.component.locator(this.purchaseOrderSel).click()
        return additionalFee
    }

    private getFeeMatchesArr(searchStr: string) {
        let feeMatchesArr = searchStr.match(/\d+\.\d{2}/)
        return feeMatchesArr ? Number(feeMatchesArr[0]) : 0
    }
}