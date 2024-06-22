import { Locator } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import CheckoutComponent from "./CheckoutComponent.js";

@selector("#opc-payment_info")
export default class PaymentInformationComponent extends CheckoutComponent {

    private creditCartTypeSel = "#CreditCardType"
    private cardHolderNameInputSel = "#CardholderName"
    private cardNumberInputSel = "#CardNumber"
    private expireMonthSel = "#ExpireMonth"
    private expireYearSel = "#ExpireYear"
    private cardCodeSel = "#CardCode"

    constructor(component: Locator) {
        super(component)
        this.component.scrollIntoViewIfNeeded()
    }

    public async selectCreditCardType(creditCardType: string): Promise<void> {
        await this.component.locator(this.creditCartTypeSel).selectOption({ label: `${creditCardType}` })
    }

    public async inputCardHolderName(cardHolderName: string): Promise<void> {
        await this.component.locator(this.cardHolderNameInputSel).fill(cardHolderName)
    }

    public async inputCardNumber(cardNumber: string): Promise<void> {
        await this.component.locator(this.cardNumberInputSel).fill(cardNumber.toString())
    }

    public async selectExpireMonth(expireMonth: number): Promise<void> {
        await this.component.locator(this.expireMonthSel).selectOption({ value: `${expireMonth}`})
    }

    public async selectExpireYear(expireYear: number): Promise<void> {
        await this.component.locator(this.expireYearSel).selectOption({ label: `${expireYear}` })
    }

    public async inputCardCode(cardCode: string): Promise<void> {
        await this.component.locator(this.cardCodeSel).fill(cardCode)
    }
}