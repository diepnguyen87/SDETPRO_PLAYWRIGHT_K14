import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import Component from "../Component.js";

@selector("#opc-payment_info")
export default class PaymentInformationComponent extends Component {

    private creditCartTypeSel = "#CreditCardType"
    private cardHolderNameInputSel = "#CardholderName"
    private cardNumberInputSel = "#CardNumber"
    private expireMonthSel = "#ExpireMonth"
    private expireYearSel = "#ExpireYear"
    private cardCodeSel = "#CardCode"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo);
        this.componentLocator.scrollIntoViewIfNeeded()
    }

    public async selectCreditCardType(creditCardType: string): Promise<void> {
        await this.componentLocator.locator(this.creditCartTypeSel).selectOption({ label: `${creditCardType}` })
    }

    public async inputCardHolderName(cardHolderName: string): Promise<void> {
        await this.componentLocator.locator(this.cardHolderNameInputSel).fill(cardHolderName)
    }

    public async inputCardNumber(cardNumber: string): Promise<void> {
        await this.componentLocator.locator(this.cardNumberInputSel).fill(cardNumber.toString())
    }

    public async selectExpireMonth(expireMonth: number): Promise<void> {
        await this.componentLocator.locator(this.expireMonthSel).selectOption({ value: `${expireMonth}`})
    }

    public async selectExpireYear(expireYear: number): Promise<void> {
        await this.componentLocator.locator(this.expireYearSel).selectOption({ label: `${expireYear}` })
    }

    public async inputCardCode(cardCode: string): Promise<void> {
        await this.componentLocator.locator(this.cardCodeSel).fill(cardCode)
    }
}