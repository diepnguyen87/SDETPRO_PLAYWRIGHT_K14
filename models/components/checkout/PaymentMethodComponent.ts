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
        let additionalFee = this.getFeeMatchesArr(await this.componentLocator.locator(this.cashOnDeliverySel).innerText())
        await this.componentLocator.locator(this.cashOnDeliverySel).click()
        return additionalFee
    }

    public async selectCheckMoneyOrder(): Promise<number> {
        let additionalFee = this.getFeeMatchesArr(await this.componentLocator.locator(this.cashOnDeliverySel).innerText())
        await this.componentLocator.locator(this.checkMoneyOrderSel).click()
        return additionalFee
    }

    public async selectCreditCard(): Promise<number> {
        let additionalFee = this.getFeeMatchesArr(await this.componentLocator.locator(this.cashOnDeliverySel).innerText())
        await this.componentLocator.locator(this.creditCardSel).click()
        return additionalFee
    }

    public async selectPurchaseOrder(): Promise<number> {
        let additionalFee = this.getFeeMatchesArr(await this.componentLocator.locator(this.cashOnDeliverySel).innerText())
        await this.componentLocator.locator(this.purchaseOrderSel).click()
        return additionalFee
    }

    private getFeeMatchesArr(searchStr: string) {
        let feeMatchesArr = searchStr.match(/\d+\.\d{2}/)
        return feeMatchesArr ? Number(feeMatchesArr[0]) : 0
    }
}