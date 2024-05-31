import { Page } from "@playwright/test";
import BillingAddressComponent from "../components/checkout/BillingAddressComponent.js";
import ConfirmOrderComponent from "../components/checkout/ConfirmOrderComponent.js";
import PaymentInformationComponent from "../components/checkout/PaymentInformationComponent.js";
import PaymentMethodComponent from "../components/checkout/PaymentMethodComponent.js";
import ShippingAddressComponent from "../components/checkout/ShippingAddressComponent.js";
import ShippingMethodComponent from "../components/checkout/ShippingMethodComponent.js";

export default class CheckoutPage {

    constructor(private page: Page) {
        this.page = page
    }

    public billingAddressComp(): BillingAddressComponent {
        return new BillingAddressComponent(this.page.locator(BillingAddressComponent.selectorValue))
    }

    public shippingAddressComp(): ShippingAddressComponent {
        return new ShippingAddressComponent(this.page.locator(ShippingAddressComponent.selectorValue))
    }

    public shippingMethodComp(): ShippingMethodComponent {
        return new ShippingMethodComponent(this.page.locator(ShippingMethodComponent.selectorValue))
    }

    public paymentMethodComp(): PaymentMethodComponent {
        return new PaymentMethodComponent(this.page.locator(PaymentMethodComponent.selectorValue))
    }

    public paymentInformationComp(): PaymentInformationComponent {
        return new PaymentInformationComponent(this.page.locator(PaymentInformationComponent.selectorValue))
    }

    public confirmOrderComp(): ConfirmOrderComponent {
        return new ConfirmOrderComponent(this.page.locator(ConfirmOrderComponent.selectorValue))
    }
}