import { Locator } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import CheckoutComponent from "./CheckoutComponent.js";

@selector("#opc-billing")
export default class BillingAddressComponent extends CheckoutComponent {

    private firstNameInputSel = "#BillingNewAddress_FirstName"
    private lastNameInputSel = "#BillingNewAddress_LastName"
    private emailInputSel = "#BillingNewAddress_Email"
    private companyInputSel = "#BillingNewAddress_Company"
    private countryDropdownSel = "#BillingNewAddress_CountryId"
    private stateProvinceDropdownSel = "#BillingNewAddress_StateProvinceId"
    private cityInputSel = "#BillingNewAddress_City"
    private address1InputSel = "#BillingNewAddress_Address1"
    private zipPostalCodeInputSel = "#BillingNewAddress_ZipPostalCode"
    private phoneNumberInputSel = "#BillingNewAddress_PhoneNumber"

    constructor(component: Locator) {
        super(component)
    }

    public async inputFirstName(firstName: string): Promise<void> {
        await this.component.locator(this.firstNameInputSel).fill(firstName)
    }

    public async inputLastName(lastName: string): Promise<void> {
        await this.component.locator(this.lastNameInputSel).fill(lastName)
    }

    public async inputEmail(email: string): Promise<void> {
        await this.component.locator(this.emailInputSel).fill(email)
    }

    public async inputCompany(companyName: string): Promise<void> {
        await this.component.locator(this.companyInputSel).fill(companyName)
    }

    public async selectCountry(countryName: string): Promise<void> {
        await this.component.locator(this.countryDropdownSel).selectOption({ label: countryName })
    }

    public async selectStateProvince(stateProvinceName: string): Promise<void> {
        await this.component.locator(this.stateProvinceDropdownSel).selectOption({ label: stateProvinceName })
    }

    public async inputCity(cityName: string): Promise<void> {
        await this.component.locator(this.cityInputSel).fill(cityName)
    }

    public async inputAddress1(address1: string): Promise<void> {
        await this.component.locator(this.address1InputSel).fill(address1)
    }

    public async inputZipPostalCode(zipPostalCode: string): Promise<void> {
        await this.component.locator(this.zipPostalCodeInputSel).fill(zipPostalCode)
    }

    public async inputPhoneNumber(phoneNumber: string): Promise<void> {
        await this.component.locator(this.phoneNumberInputSel).fill(phoneNumber)
    }
}