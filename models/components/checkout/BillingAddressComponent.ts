import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../SelectorDecorator.js";
import Component from "../Component.js";

@selector("#opc-billing")
export default class BillingAddressComponent extends Component {

    private buildingAddressDropdownSel = "#billing-address-select"
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

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo);
        // this.componentLocator.scrollIntoViewIfNeeded();
    }

    public async selectNewAdressIfExist(): Promise<void> {
        const dropdown = this.componentLocator.locator(this.buildingAddressDropdownSel);
        if (await dropdown.count() > 0) {
            await this.withHealing(this.buildingAddressDropdownSel, l => l.selectOption({ label: "New Address" }));
        }
    }

    public async inputFirstName(firstName: string): Promise<void> {
        await this.withHealing(this.firstNameInputSel, l => l.fill(firstName));
    }

    public async inputLastName(lastName: string): Promise<void> {
        await this.withHealing(this.lastNameInputSel, l => l.fill(lastName));
    }

    public async inputEmail(email: string): Promise<void> {
        await this.withHealing(this.emailInputSel, l => l.fill(email));
    }

    public async inputCompany(companyName: string): Promise<void> {
        await this.withHealing(this.companyInputSel, l => l.fill(companyName));
    }

    public async selectCountry(countryName: string): Promise<void> {
        await this.withHealing(this.countryDropdownSel, l => l.selectOption({ label: countryName }));
    }

    public async selectStateProvince(stateProvinceName: string): Promise<void> {
        await this.withHealing(this.stateProvinceDropdownSel, l => l.selectOption({ label: stateProvinceName }));
    }

    public async inputCity(cityName: string): Promise<void> {
        await this.withHealing(this.cityInputSel, l => l.fill(cityName));
    }

    public async inputAddress1(address1: string): Promise<void> {
        await this.withHealing(this.address1InputSel, l => l.fill(address1));
    }

    public async inputZipPostalCode(zipPostalCode: string): Promise<void> {
        await this.withHealing(this.zipPostalCodeInputSel, l => l.fill(zipPostalCode));
    }

    public async inputPhoneNumber(phoneNumber: string): Promise<void> {
        await this.withHealing(this.phoneNumberInputSel, l => l.fill(phoneNumber));
    }
}