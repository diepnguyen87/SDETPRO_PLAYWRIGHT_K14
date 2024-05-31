import { Page } from "@playwright/test";
import paymentMethods from "../../constant/PaymentMethod.js";
import CartItemRowComponent from "../../models/components/cart/CartItemRowComponent.js";
import TotalComponent from "../../models/components/cart/TotalComponent.js";
import BillingAddressComponent from "../../models/components/checkout/BillingAddressComponent.js";
import PaymentInformationComponent from "../../models/components/checkout/PaymentInformationComponent.js";
import PaymentMethodComponent from "../../models/components/checkout/PaymentMethodComponent.js";
import ShippingAddressComponent from "../../models/components/checkout/ShippingAddressComponent.js";
import ShippingMethodComponent from "../../models/components/checkout/ShippingMethodComponent.js";
import ComputerEssentialComponent from "../../models/components/computer/ComputerEssentialComponent.js";
import CheckoutAsGuestPage from "../../models/pages/CheckoutAsGuestPage.js";
import CheckoutPage from "../../models/pages/CheckoutPage.js";
import ComputerDetailPage, { ComputerComponentConstructor } from "../../models/pages/ComputerDetailPage.js";
import ShoppingCartPage from "../../models/pages/ShoppingCartPage.js";
import BillingAddressData from "../../test-data/checkout/BillingAddressData.json" assert { type: "json" };
import shippingMethodData from "../../test-data/checkout/ShippingMethodData.json" assert { type: "json" };
import { CreditCard, CreditCardType, cardType } from "../../type/DataType.js";
import { getAdditionalPriceByRegex } from "../../utils/RegexHelper.js";
import BaseFlow from "../BaseFlow.js";
import ConfirmOrderComponent from "../../models/components/checkout/ConfirmOrderComponent.js";

export default class OrderTestFlow extends BaseFlow {
    private totalPrice: number = 0;
    private shippingPrice: number = 0;

    constructor(page: Page,
        private readonly computerComponentClass: ComputerComponentConstructor<ComputerEssentialComponent>,
        private readonly computerData: any,
        private readonly computerDataList: any[] | undefined
    ) {
        super(page)
        this.computerComponentClass = computerComponentClass;
        this.computerData = computerData;
        this.computerDataList = computerDataList;
    }

    public async buildComputerDetailListAndAddToCart() {
        if (this.computerDataList === undefined) {
            throw new Error("Computer Data List is empty");
        }
        for (const computerData of this.computerDataList) {
            await this.buildComputerDetailAndAddToCart(computerData)
        }
    }

    private async buildComputerDetailAndAddToCart(computerData: any) {
        const computerDetailPage: ComputerDetailPage = new ComputerDetailPage(this.page);
        const computerComponent: ComputerEssentialComponent = computerDetailPage.computerComponent(this.computerComponentClass);
        await computerComponent.unselectDefaultCheckbox();

        const selectedProcessorText = await computerComponent.selectProcessorByName(computerData.processor);
        const selectedRAMText = await computerComponent.selectRAMByName(computerData.RAM);
        const selectedHDDText = await computerComponent.selectHDDByName(computerData.HDD);
        let selectedOSText = undefined
        if (computerData.OS) {
            selectedOSText = await computerComponent.selectOSByName(computerData.OS)
        }
        const selectedSoftwareText = await computerComponent.selectSoftwareByName(computerData.software);

        this.totalPrice += await this.calculateTotalPrice(selectedProcessorText,
            selectedRAMText,
            selectedHDDText,
            selectedOSText,
            selectedSoftwareText,
            computerComponent
        )

        await computerComponent.clickOnAddToCartBtn()
        const contentMsg = await computerDetailPage.notificationComp().getContentMessage()
        if (contentMsg !== "The product has been added to your shopping cart") {
            throw new Error("Add to cart failed");
        }
        await this.page.waitForTimeout(1 * 1000)
    }

    public async buildRandomComputerDetailListAndAddToCart(pcBuilds: number) {
        for (let index = 0; index < pcBuilds; ++index) {
            await this.buildRandomComputerDetailAndAddToCart()
        }
    }

    private async buildRandomComputerDetailAndAddToCart() {
        const computerDetailPage: ComputerDetailPage = new ComputerDetailPage(this.page);
        const computerComponent: ComputerEssentialComponent = computerDetailPage.computerComponent(this.computerComponentClass);
        await computerComponent.unselectDefaultCheckbox();

        const selectedProcessorText = await this.selectRandomProcessor(computerComponent)
        const selectedRAMText = await this.selectRandomRAM(computerComponent)
        const selectedHDDText = await this.selectRandomHDD(computerComponent)
        const selectedOSText = await this.selectRandomOS(computerComponent)
        const selectedSoftwareText = await this.selectRandomSoftware(computerComponent)

        this.totalPrice += await this.calculateTotalPrice(selectedProcessorText,
            selectedRAMText,
            selectedHDDText,
            selectedOSText,
            selectedSoftwareText,
            computerComponent
        )

        await computerComponent.clickOnAddToCartBtn()
        const contentMsg = await computerDetailPage.notificationComp().getContentMessage()
        if (contentMsg !== "The product has been added to your shopping cart") {
            throw new Error("Add to cart failed");
        }
        await this.page.waitForTimeout(1 * 1000)
    }

    public async verifyShoppingCart(): Promise<void> {
        const shoppingCartPage: ShoppingCartPage = new ShoppingCartPage(this.page)
        const cartItemRowCompList: CartItemRowComponent[] = await shoppingCartPage.cartItemRowCompList()
        for (const cartItemRowComp of cartItemRowCompList) {
            const unitPrice = await cartItemRowComp.getProductUnitPrice()
            const quantity = await cartItemRowComp.qualityInput().getAttribute('value');
            const subTotal = await cartItemRowComp.getProductSubTotal();
            console.log(`unitPrice: ${unitPrice}, quantity: ${quantity},  subTotal: ${subTotal}`);
        }

        console.log("Shopping Cart Price: " + await shoppingCartPage.totalComp().priceCategories());
    }

    public async selectTOSandCheckout() {
        const shoppingCartPage: ShoppingCartPage = new ShoppingCartPage(this.page)
        await shoppingCartPage.totalComp().selectTermOfService()
        await shoppingCartPage.totalComp().clickOnCheckoutBtn()

        const checkoutAsGuestPage: CheckoutAsGuestPage = new CheckoutAsGuestPage(this.page)
        await checkoutAsGuestPage.clickOnCheckoutAsGuestBtn();
    }

    public async inputBillingAddress(): Promise<void> {
        const {
            firstName, lastName, email, company, country, stateProvince, city, address1, zipPostalCode, phoneNumber
        } = BillingAddressData

        const checkoutPage: CheckoutPage = new CheckoutPage(this.page)
        const billingAddressComp: BillingAddressComponent = checkoutPage.billingAddressComp()
        await billingAddressComp.inputFirstName(firstName)
        await billingAddressComp.inputLastName(lastName)
        await billingAddressComp.inputEmail(email)
        await billingAddressComp.inputCompany(company)
        await billingAddressComp.selectCountry(country)
        await billingAddressComp.selectStateProvince(stateProvince)
        await billingAddressComp.inputCity(city)
        await billingAddressComp.inputAddress1(address1)
        await billingAddressComp.inputZipPostalCode(zipPostalCode)
        await billingAddressComp.inputPhoneNumber(phoneNumber)
        await billingAddressComp.clickOnContinueBtn()
    }

    public async inputShippingAddress(): Promise<void> {
        const checkoutPage: CheckoutPage = new CheckoutPage(this.page)
        const shippingAddressComp: ShippingAddressComponent = checkoutPage.shippingAddressComp()
        await shippingAddressComp.clickOnContinueBtn()
    }

    public async selectShippingMethod(): Promise<void> {
        const { shippingMethod } = shippingMethodData
        const checkoutPage: CheckoutPage = new CheckoutPage(this.page)
        const shippingMethodComp: ShippingMethodComponent = checkoutPage.shippingMethodComp()
        const shippingPriceText = await shippingMethodComp.selectMethod(this.generateRandomIndex(shippingMethod.length))

        const matches = shippingPriceText.match(/(\d+)/g)
        this.shippingPrice = matches ? Number(matches[0]) : 0
        await shippingMethodComp.clickOnContinueBtn()
    }

    public async selectPaymentMethod(paymentMethod: string): Promise<void> {
        const { cash, check, creditCard, purchaseOrder } = paymentMethods
        const checkoutPage: CheckoutPage = new CheckoutPage(this.page)
        const paymentMethodComp: PaymentMethodComponent = checkoutPage.paymentMethodComp()
        switch (paymentMethod) {
            case cash:
                await paymentMethodComp.selectCashOnDelivery()
                break;
            case check:
                await paymentMethodComp.selectCheckMoneyOrder()
                break;
            case creditCard:
                await paymentMethodComp.selectCreditCard()
                break;
            case purchaseOrder:
                await paymentMethodComp.selectPurchaseOrder()
        }
        await paymentMethodComp.clickOnContinueBtn()
    }

    public async inputPaymentInfo(creditCard: CreditCard) {
        const checkoutPage: CheckoutPage = new CheckoutPage(this.page)
        const paymentInformationComp: PaymentInformationComponent = checkoutPage.paymentInformationComp()
        await paymentInformationComp.selectCreditCardType(cardType[creditCard.type as CreditCardType])
        await paymentInformationComp.inputCardHolderName(creditCard.fullName)
        await paymentInformationComp.inputCardNumber(creditCard.cardNumber)
        let expiredDate = new Date(creditCard.date)
        await paymentInformationComp.selectExpireMonth(expiredDate.getMonth())
        await paymentInformationComp.selectExpireYear(expiredDate.getFullYear())
        await paymentInformationComp.inputCardCode(creditCard.cvv)

        await paymentInformationComp.clickOnContinueBtn()
    }

    public async confirmOrder() {
        const checkoutPage: CheckoutPage = new CheckoutPage(this.page)
        const confirmOrderComp: ConfirmOrderComponent = await checkoutPage.confirmOrderComp()
        const priceCategoryList = await confirmOrderComp.totalComp().priceCategories()
        console.log("Checkout price: " + priceCategoryList);

        await confirmOrderComp.clickOnConfirmBtn()
    }

    private generateRandomIndex(size: number) {
        return Math.floor(Math.random() * size)
    }

    private async selectRandomProcessor(computerComponent: ComputerEssentialComponent): Promise<string | undefined> {
        if (this.computerData.processor) {
            let randomProcessorIndex = this.generateRandomIndex(this.computerData.processor.length)
            return await computerComponent.selectProcessorByIndex(randomProcessorIndex);
        }
    }

    private async selectRandomRAM(computerComponent: ComputerEssentialComponent): Promise<string | undefined> {
        if (this.computerData.RAM) {
            let randomRAMIndex = this.generateRandomIndex(this.computerData.RAM.length)
            return await computerComponent.selectRAMByIndex(randomRAMIndex);
        }
    }

    private async selectRandomHDD(computerComponent: ComputerEssentialComponent): Promise<string | undefined> {
        if (this.computerData.HDD) {
            let randomHDDIndex = this.generateRandomIndex(this.computerData.HDD.length)
            return await computerComponent.selectHDDByIndex(randomHDDIndex);
        }
    }

    private async selectRandomOS(computerComponent: ComputerEssentialComponent): Promise<string | undefined> {
        if (this.computerData.OS) {
            let randomOSIndex = this.generateRandomIndex(this.computerData.OS.length)
            return await computerComponent.selectOSByIndex(randomOSIndex);
        }
    }

    private async selectRandomSoftware(computerComponent: ComputerEssentialComponent): Promise<string | undefined> {
        if (this.computerData.software) {
            let randomSoftwareIndex = this.generateRandomIndex(this.computerData.software.length)
            return await computerComponent.selectSoftwareByIndex(randomSoftwareIndex);
        }
    }

    private async calculateTotalPrice(selectedProcessorText: string | undefined,
        selectedRAMText: string | undefined,
        selectedHDDText: string | undefined,
        selectedOSText: string | undefined,
        selectedSoftwareText: string | undefined,
        computerComponent: ComputerEssentialComponent,
    ): Promise<number> {
        let processorAdditionalPrice = 0
        if (selectedProcessorText) {
            processorAdditionalPrice = getAdditionalPriceByRegex(selectedProcessorText)
        }

        let ramAdditionalPrice = 0
        if (selectedRAMText) {
            ramAdditionalPrice = getAdditionalPriceByRegex(selectedRAMText)
        }

        let hddAdditionalPrice = 0
        if (selectedHDDText) {
            hddAdditionalPrice = getAdditionalPriceByRegex(selectedHDDText)
        }

        let osAdditionalPrice = 0
        if (selectedOSText) {
            osAdditionalPrice = getAdditionalPriceByRegex(selectedOSText)
        }

        let softwareAdditionalprice = 0
        if (selectedSoftwareText) {
            softwareAdditionalprice = getAdditionalPriceByRegex(selectedSoftwareText)
        }

        const basePrice = await computerComponent.getProductPrice();
        const totalAdditionalPrice = processorAdditionalPrice
            + ramAdditionalPrice
            + hddAdditionalPrice
            + osAdditionalPrice
            + softwareAdditionalprice
        return basePrice + totalAdditionalPrice
    }
}