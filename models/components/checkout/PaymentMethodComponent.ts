import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import Component from "../Component.js";

@selector("#opc-payment_method")
export default class PaymentMethodComponent extends Component {

    private cashOnDeliverySel = "input[value='Payments.CashOnDelivery']"
    private checkMoneyOrderSel = "input[value='Payments.CheckMoneyOrder']"
    private creditCardSel = "input[value='Payments.Manual']"
    private purchaseOrderSel = "input[value='Payments.PurchaseOrder']"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo);
        this.componentLocator.scrollIntoViewIfNeeded()
    }

    public async selectCashOnDelivery(): Promise<number> {
        const additionalFee = this.getFeeMatchesArr(await this.componentLocator.locator(this.cashOnDeliverySel).innerText());
        await this.withHealing(this.cashOnDeliverySel, l => l.click());
        return additionalFee;
    }

    public async selectCheckMoneyOrder(): Promise<number> {
        const additionalFee = this.getFeeMatchesArr(await this.componentLocator.locator(this.cashOnDeliverySel).innerText());
        await this.withHealing(this.checkMoneyOrderSel, l => l.click());
        return additionalFee;
    }

    public async selectCreditCard(): Promise<number> {
        const additionalFee = this.getFeeMatchesArr(await this.componentLocator.locator(this.cashOnDeliverySel).innerText());
        await this.withHealing(this.creditCardSel, l => l.click());
        return additionalFee;
    }

    public async selectPurchaseOrder(): Promise<number> {
        const additionalFee = this.getFeeMatchesArr(await this.componentLocator.locator(this.cashOnDeliverySel).innerText());
        await this.withHealing(this.purchaseOrderSel, l => l.click());
        return additionalFee;
    }

    private getFeeMatchesArr(searchStr: string) {
        let feeMatchesArr = searchStr.match(/\d+\.\d{2}/)
        return feeMatchesArr ? Number(feeMatchesArr[0]) : 0
    }
}