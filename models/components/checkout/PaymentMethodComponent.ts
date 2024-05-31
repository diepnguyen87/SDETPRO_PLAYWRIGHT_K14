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
    }

    public async selectCashOnDelivery(): Promise<void> {
        await this.component.locator(this.cashOnDeliverySel).click()
    }

    public async selectCheckMoneyOrder():Promise<void>{
        await this.component.locator(this.checkMoneyOrderSel).click()
    }

    public async selectCreditCard():Promise<void>{
        await this.component.locator(this.creditCardSel).click()
    }

    public async selectPurchaseOrder():Promise<void>{
        await this.component.locator(this.purchaseOrderSel).click()
    }
}