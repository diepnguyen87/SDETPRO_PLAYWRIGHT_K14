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
        await this.withHealing(this.creditCartTypeSel, l => l.selectOption({ label: creditCardType }));
    }

    public async inputCardHolderName(cardHolderName: string): Promise<void> {
        await this.withHealing(this.cardHolderNameInputSel, l => l.fill(cardHolderName));
    }

    public async inputCardNumber(cardNumber: string): Promise<void> {
        await this.withHealing(this.cardNumberInputSel, l => l.fill(cardNumber.toString()));
    }

    public async selectExpireMonth(expireMonth: number): Promise<void> {
        await this.withHealing(this.expireMonthSel, l => l.selectOption({ value: `${expireMonth}` }));
    }

    public async selectExpireYear(expireYear: number): Promise<void> {
        await this.withHealing(this.expireYearSel, l => l.selectOption({ label: `${expireYear}` }));
    }

    public async inputCardCode(cardCode: string): Promise<void> {
        await this.withHealing(this.cardCodeSel, l => l.fill(cardCode));
    }
}