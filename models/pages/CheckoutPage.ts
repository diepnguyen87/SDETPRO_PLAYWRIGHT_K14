import { Page, TestInfo } from "@playwright/test";
import BillingAddressComponent from "../components/checkout/BillingAddressComponent.js";
import CompletedComponent from "../components/checkout/CompletedComponent.js";
import ConfirmOrderComponent from "../components/checkout/ConfirmOrderComponent.js";
import PaymentInformationComponent from "../components/checkout/PaymentInformationComponent.js";
import PaymentMethodComponent from "../components/checkout/PaymentMethodComponent.js";
import ShippingAddressComponent from "../components/checkout/ShippingAddressComponent.js";
import ShippingMethodComponent from "../components/checkout/ShippingMethodComponent.js";
import BasePage from "./BasePage.js";

export default class CheckoutPage extends BasePage{

    constructor(protected page: Page, protected testInfo: TestInfo) {
        super(page, testInfo);
    }

    public billingAddressComp(): BillingAddressComponent {
        return new BillingAddressComponent(this.page, this.page.locator(BillingAddressComponent.selectorValue), this.testInfo)
    }

    public shippingAddressComp(): ShippingAddressComponent {
        return new ShippingAddressComponent(this.page, this.page.locator(ShippingAddressComponent.selectorValue), this.testInfo)
    }

    public shippingMethodComp(): ShippingMethodComponent {
        return new ShippingMethodComponent(this.page, this.page.locator(ShippingMethodComponent.selectorValue), this.testInfo)
    }

    public paymentMethodComp(): PaymentMethodComponent {
        return new PaymentMethodComponent(this.page, this.page.locator(PaymentMethodComponent.selectorValue), this.testInfo)
    }

    public paymentInformationComp(): PaymentInformationComponent {
        return new PaymentInformationComponent(this.page, this.page.locator(PaymentInformationComponent.selectorValue), this.testInfo)
    }

    public confirmOrderComp(): ConfirmOrderComponent {
        return new ConfirmOrderComponent(this.page, this.page.locator(ConfirmOrderComponent.selectorValue), this.testInfo)
    }

    public orderCompletedComp(): CompletedComponent {
        return new CompletedComponent(this.page, this.page.locator(CompletedComponent.selectorValue), this.testInfo)
    }
}