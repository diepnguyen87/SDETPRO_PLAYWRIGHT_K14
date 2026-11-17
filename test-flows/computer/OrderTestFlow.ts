import { Page, TestInfo, expect } from "@playwright/test";
import paymentMethods from "../../constant/PaymentMethod.js";
import CartItemRowComponent from "../../models/components/cart/CartItemRowComponent.js";
import BillingAddressComponent from "../../models/components/checkout/BillingAddressComponent.js";
import CompletedComponent from "../../models/components/checkout/CompletedComponent.js";
import ConfirmOrderComponent from "../../models/components/checkout/ConfirmOrderComponent.js";
import PaymentInformationComponent from "../../models/components/checkout/PaymentInformationComponent.js";
import PaymentMethodComponent from "../../models/components/checkout/PaymentMethodComponent.js";
import ShippingAddressComponent from "../../models/components/checkout/ShippingAddressComponent.js";
import ShippingMethodComponent from "../../models/components/checkout/ShippingMethodComponent.js";
import ComputerEssentialComponent from "../../models/components/computer/ComputerEssentialComponent.js";
import CheckoutAsGuestPage from "../../models/pages/CheckoutAsGuestPage.js";
import CheckoutCompletedPage from "../../models/pages/CheckoutCompletedPage.js";
import CheckoutPage from "../../models/pages/CheckoutPage.js";
import ComputerDetailPage, { ComputerComponentConstructor } from "../../models/pages/ComputerDetailPage.js";
import OrderDetailsPage from "../../models/pages/OrderDetailsPage.js";
import ShoppingCartPage from "../../models/pages/ShoppingCartPage.js";
import { testData } from "../../test-data/TestDataProvider.js";

const BillingAddressData = testData.billingAddress;
const shippingMethodData = testData.shippingMethod;
const termsOfServiceWarningData = testData.termsOfServiceWarning;
const orderCompletedData = testData.orderCompleted;
const paymentInformationData = testData.paymentInformation;
const shoppingCartData = testData.shoppingCart;
import { CreditCard, CreditCardType, cardType } from "../../type/DataType.js";
import { getAdditionalPriceByRegex } from "../../utils/RegexHelper.js";
import BaseFlow from "../BaseFlow.js";
import LoggerManager from "../../utils/LoggerManager.js";

type CartItemSnapshot = { name: string; attributes: string; unitPrice: number; quantity: number; subTotal: number }

export default class OrderTestFlow extends BaseFlow {
    private rawTotalPrice: number = 0;
    private shippingPrice: number = 0;
    private additionalFee: number = 0;
    private logger;

    constructor(public page: Page,
        private readonly computerComponentClass: ComputerComponentConstructor<ComputerEssentialComponent>,
        private readonly computerData: any,
        private readonly computerDataList: any[] | undefined,
        testInfo: TestInfo
    ) {
        super(page, testInfo)
        this.computerComponentClass = computerComponentClass;
        this.computerData = computerData;
        this.computerDataList = computerDataList;
        this.logger = LoggerManager.getLogger(testInfo);
    }

    public async buildComputerDetailListAndAddToCart() {
        if (this.computerDataList === undefined) {
            this.logger.error("Computer Data List is empty");
            throw new Error("Computer Data List is empty");
        }

        for (let index = 0; index < this.computerDataList.length; index++) {
            this.logger.info("Building computer " + (index+1));
            await this.buildComputerDetailAndAddToCart(this.computerDataList[index])
            
        }
    }

    private async buildComputerDetailAndAddToCart(computerData: any) {
        const computerDetailPage: ComputerDetailPage = new ComputerDetailPage(this.page, this.testInfo);
        const beforeCardQty = await computerDetailPage.headerComp().getCartQty();
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

        this.rawTotalPrice += await this.calculateTotalRawPrice(selectedProcessorText,
            selectedRAMText,
            selectedHDDText,
            selectedOSText,
            selectedSoftwareText,
            computerComponent
        )

        await computerComponent.clickOnAddToCartBtn();

        await expect(
            await computerDetailPage.notificationComp().getContentMessage(),
            "Add to cart failed"
        ).toEqual("The product has been added to your shopping cart");

        await expect.poll(async () => {
            return await computerDetailPage.headerComp().getCartQty();
        }).toBe(beforeCardQty + 1);
        await computerDetailPage.notificationComp().close();

        // unselect software checkbox
        await computerComponent.unselectSoftwareByName(computerData.software);
    }

    public async buildRandomComputerDetailListAndAddToCart(pcBuilds: number) {
        for (let index = 0; index < pcBuilds; ++index) {
            await this.buildRandomComputerDetailAndAddToCart()
        }
    }

    private async buildRandomComputerDetailAndAddToCart() {
        const computerDetailPage: ComputerDetailPage = new ComputerDetailPage(this.page, this.testInfo);
        const beforeCardQty = await computerDetailPage.headerComp().getCartQty();
        const computerComponent: ComputerEssentialComponent = computerDetailPage.computerComponent(this.computerComponentClass);
        await computerComponent.unselectDefaultCheckbox();

        const selectedProcessorText = await this.selectRandomProcessor(computerComponent)
        const selectedRAMText = await this.selectRandomRAM(computerComponent)
        const selectedHDDText = await this.selectRandomHDD(computerComponent)
        const selectedOSText = await this.selectRandomOS(computerComponent)
        const selectedSoftwareText = await this.selectRandomSoftware(computerComponent)

        this.rawTotalPrice += await this.calculateTotalRawPrice(selectedProcessorText,
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
        await expect.poll(async () => {
            return await computerDetailPage.headerComp().getCartQty();
        }).toBe(beforeCardQty + 1);
        await computerDetailPage.notificationComp().close();
    }

    public async verifyShoppingCart(): Promise<void> {
        const shoppingCartPage: ShoppingCartPage = new ShoppingCartPage(this.page, this.testInfo)
        const cartItemRowCompList: CartItemRowComponent[] = await shoppingCartPage.cartItemRowCompList()
        for (const cartItemRowComp of cartItemRowCompList) {
            const unitPrice = await cartItemRowComp.getProductUnitPrice()
            const unitQuantity = await cartItemRowComp.getQuantity();
            const unitTotal = await cartItemRowComp.getProductSubTotal();
            expect(unitPrice * unitQuantity).toEqual(unitTotal)
        }

        let priceCategories: any = await shoppingCartPage.totalComp().priceCategories()
        let subTotal = priceCategories["Sub-Total:"]
        let shipping = priceCategories["Shipping:"]
        let tax = priceCategories["Tax:"]
        let total = priceCategories["Total:"]
        expect(subTotal + shipping + tax).toEqual(total)
        expect(subTotal).toEqual(this.rawTotalPrice)
    }

    public async removeCartItemsAndVerify(rowIndexes: number[]): Promise<void> {
        const shoppingCartPage: ShoppingCartPage = new ShoppingCartPage(this.page, this.testInfo)
        const beforeRows = await shoppingCartPage.cartItemRowCompList()
        const beforeSnapshots = await this.snapshotCartItems(beforeRows)
        const removedSnapshots = beforeSnapshots.filter((_, index) => rowIndexes.includes(index))
        const remainingSnapshots = beforeSnapshots.filter((_, index) => !rowIndexes.includes(index))

        for (const rowIndex of rowIndexes) {
            await beforeRows[rowIndex].selectRemove()
        }
        await shoppingCartPage.clickOnUpdateCartBtn()
        await expect.poll(() => shoppingCartPage.getCartItemRowCount()).toBe(beforeRows.length - rowIndexes.length)

        if (remainingSnapshots.length === 0) {
            await this.verifyEmptyShoppingCart()
            return
        }

        const afterRows = await shoppingCartPage.cartItemRowCompList()
        const afterSnapshots = await this.snapshotCartItems(afterRows)
        expect(afterSnapshots).toEqual(remainingSnapshots)

        const afterAttributes = afterSnapshots.map(snapshot => snapshot.attributes)
        for (const removedSnapshot of removedSnapshots) {
            expect(afterAttributes).not.toContain(removedSnapshot.attributes)
        }

        for (const afterRow of afterRows) {
            expect(await afterRow.hasRemoveButton()).toBe(false)
        }

        const remainingQuantity = remainingSnapshots.reduce((sum, snapshot) => sum + snapshot.quantity, 0)
        await expect.poll(() => shoppingCartPage.headerComp().getCartQty()).toBe(remainingQuantity)

        const priceCategories: any = await shoppingCartPage.totalComp().priceCategories()
        const subTotal = priceCategories["Sub-Total:"]
        const shipping = priceCategories["Shipping:"]
        const tax = priceCategories["Tax:"]
        const total = priceCategories["Total:"]
        const remainingSubTotal = remainingSnapshots.reduce((sum, snapshot) => sum + snapshot.subTotal, 0)
        expect(subTotal).toBeCloseTo(remainingSubTotal, 2)
        expect(subTotal + shipping + tax).toBeCloseTo(total, 2)
    }

    public async selectRemoveWithoutUpdateAndVerify(rowIndexes: number[]): Promise<void> {
        const shoppingCartPage: ShoppingCartPage = new ShoppingCartPage(this.page, this.testInfo)
        const beforeRows = await shoppingCartPage.cartItemRowCompList()
        const beforeSnapshots = await this.snapshotCartItems(beforeRows)
        const beforeCartQty = await shoppingCartPage.headerComp().getCartQty()

        for (const rowIndex of rowIndexes) {
            await beforeRows[rowIndex].selectRemove()
        }
        await this.navigateToShoppingCartPage()

        for (const rowIndex of rowIndexes) {
            await expect.poll(() => beforeRows[rowIndex].isRemoveSelected()).toBe(false)
        }
        await expect.poll(() => shoppingCartPage.getCartItemRowCount()).toBe(beforeRows.length)
        const afterSnapshots = await this.snapshotCartItems(await shoppingCartPage.cartItemRowCompList())
        expect(afterSnapshots).toEqual(beforeSnapshots)
        await expect.poll(() => shoppingCartPage.headerComp().getCartQty()).toBe(beforeCartQty)
    }

    public async verifyEmptyShoppingCart(): Promise<void> {
        const shoppingCartPage: ShoppingCartPage = new ShoppingCartPage(this.page, this.testInfo)
        await expect.poll(() => shoppingCartPage.getCartItemRowCount()).toBe(0)
        expect(await shoppingCartPage.getEmptyCartMessage()).toEqual(shoppingCartData.emptyCartMessage)
        await expect(shoppingCartPage.updateCartBtn()).toBeHidden()
        await expect.poll(() => shoppingCartPage.headerComp().getShoppingCartLinkText()).toEqual(shoppingCartData.emptyCartHeaderText)
    }

    public async removeCartItemsWithFailedUpdateAndVerify(rowIndexes: number[]): Promise<void> {
        const shoppingCartPage: ShoppingCartPage = new ShoppingCartPage(this.page, this.testInfo)
        const beforeRows = await shoppingCartPage.cartItemRowCompList()
        const beforeSnapshots = await this.snapshotCartItems(beforeRows)
        const beforeCartQty = await shoppingCartPage.headerComp().getCartQty()
        const beforeSubTotal = (await shoppingCartPage.totalComp().priceCategories())["Sub-Total:"]

        for (const rowIndex of rowIndexes) {
            await beforeRows[rowIndex].selectRemove()
        }
        await shoppingCartPage.submitUpdateCartWithFailedRequest()
        await this.navigateToShoppingCartPage()

        for (const rowIndex of rowIndexes) {
            await expect.poll(() => beforeRows[rowIndex].isRemoveSelected()).toBe(false)
        }
        await expect.poll(() => shoppingCartPage.getCartItemRowCount()).toBe(beforeRows.length)
        const afterSnapshots = await this.snapshotCartItems(await shoppingCartPage.cartItemRowCompList())
        expect(afterSnapshots).toEqual(beforeSnapshots)
        await expect.poll(() => shoppingCartPage.headerComp().getCartQty()).toBe(beforeCartQty)
        const afterSubTotal = (await shoppingCartPage.totalComp().priceCategories())["Sub-Total:"]
        expect(afterSubTotal).toBeCloseTo(beforeSubTotal, 2)
    }

    private async snapshotCartItems(rows: CartItemRowComponent[]): Promise<CartItemSnapshot[]> {
        const snapshots: CartItemSnapshot[] = []
        for (const row of rows) {
            snapshots.push({
                name: await row.getProductName(),
                attributes: await row.getAttributes(),
                unitPrice: await row.getProductUnitPrice(),
                quantity: await row.getQuantity(),
                subTotal: await row.getProductSubTotal(),
            })
        }
        return snapshots
    }

    public async checkoutWithoutTOSAndVerifyWarningPopup(): Promise<void> {
        const { title, message } = termsOfServiceWarningData
        const shoppingCartPage: ShoppingCartPage = new ShoppingCartPage(this.page, this.testInfo)
        const totalComp = shoppingCartPage.totalComp()

        expect(await totalComp.isTermOfServiceChecked()).toBe(false)
        await totalComp.clickOnCheckoutBtn()

        await expect(shoppingCartPage.tosWarningDialog(title)).toBeVisible()
        expect(await shoppingCartPage.getTosWarningMessage()).toEqual(message)
        await expect(this.page).toHaveURL(/\/cart$/)

        await shoppingCartPage.closeTosWarningDialog(title)
        await expect(shoppingCartPage.tosWarningDialog(title)).toBeHidden()
    }

    public async selectTOSandCheckoutAsGuest() {
        const shoppingCartPage: ShoppingCartPage = new ShoppingCartPage(this.page, this.testInfo)
        await shoppingCartPage.totalComp().selectTermOfService()
        await shoppingCartPage.totalComp().clickOnCheckoutBtn()

        const checkoutAsGuestPage: CheckoutAsGuestPage = new CheckoutAsGuestPage(this.page, this.testInfo)
        await checkoutAsGuestPage.clickOnCheckoutAsGuestBtn();
        await expect(this.page).toHaveURL(/\/onepagecheckout/)
    }

    public async selectTOSandCheckoutWithLogin(email: string, password: string): Promise<void> {
        const shoppingCartPage: ShoppingCartPage = new ShoppingCartPage(this.page, this.testInfo)
        await shoppingCartPage.totalComp().selectTermOfService()
        await shoppingCartPage.totalComp().clickOnCheckoutBtn()

        const checkoutAsGuestPage: CheckoutAsGuestPage = new CheckoutAsGuestPage(this.page, this.testInfo)
        const loginComp = checkoutAsGuestPage.loginComp()
        await loginComp.inputEmail(email)
        await loginComp.inputPassword(password)
        await loginComp.clickLoginBtn()
        await expect.poll(() => shoppingCartPage.headerComp().isLogoutVisible()).toBe(true);

        // Back on ShoppingCartPage — click Checkout again (logged in → goes directly to onepagecheckout)
        await shoppingCartPage.totalComp().selectTermOfService()
        await shoppingCartPage.totalComp().clickOnCheckoutBtn()
    }

    public async selectTOSAndCheckout(): Promise<void> {
        const shoppingCartPage: ShoppingCartPage = new ShoppingCartPage(this.page, this.testInfo)
        await shoppingCartPage.totalComp().selectTermOfService()
        await shoppingCartPage.totalComp().clickOnCheckoutBtn()
        await expect(this.page).toHaveURL(/\/onepagecheckout/)
    }

    public async inputBillingAddressOrUseSaved(): Promise<void> {
        const checkoutPage: CheckoutPage = new CheckoutPage(this.page, this.testInfo)
        const billingAddressComp: BillingAddressComponent = checkoutPage.billingAddressComp()
        if (await billingAddressComp.hasSavedAddress()) {
            await billingAddressComp.clickOnContinueBtn()
        } else {
            await this.inputBillingAddress()
        }
    }

    public async inputBillingAddress(): Promise<void> {
        const {
            firstName, lastName, email, company, country, stateProvince, city, address1, zipPostalCode, phoneNumber
        } = BillingAddressData

        const checkoutPage: CheckoutPage = new CheckoutPage(this.page, this.testInfo)
        const billingAddressComp: BillingAddressComponent = checkoutPage.billingAddressComp()
        await billingAddressComp.selectNewAdressIfExist()
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
        const checkoutPage: CheckoutPage = new CheckoutPage(this.page, this.testInfo)
        const shippingAddressComp: ShippingAddressComponent = checkoutPage.shippingAddressComp()
        await shippingAddressComp.clickOnContinueBtn()
    }

    public async selectShippingMethod(): Promise<void> {
        const { shippingMethod } = shippingMethodData
        const checkoutPage: CheckoutPage = new CheckoutPage(this.page, this.testInfo)
        const shippingMethodComp: ShippingMethodComponent = checkoutPage.shippingMethodComp()
        const shippingPriceText = await shippingMethodComp.selectMethod(this.generateRandomIndex(shippingMethod.length))

        const matches = shippingPriceText.match(/(\d+\.\d{2})/g)
        this.shippingPrice = matches ? Number(matches[0]) : 0
        await shippingMethodComp.clickOnContinueBtn()
    }

    public async selectPaymentMethod(paymentMethod: string): Promise<void> {
        const { cashOnDelivery, check, creditCard, purchaseOrder } = paymentMethods
        const checkoutPage: CheckoutPage = new CheckoutPage(this.page, this.testInfo)
        const paymentMethodComp: PaymentMethodComponent = checkoutPage.paymentMethodComp()
        switch (paymentMethod) {
            case cashOnDelivery:
                this.additionalFee = await paymentMethodComp.selectCashOnDelivery()
                break;
            case check:
                this.additionalFee = await paymentMethodComp.selectCheckMoneyOrder()
                break;
            case creditCard:
                this.additionalFee = await paymentMethodComp.selectCreditCard()
                break;
            case purchaseOrder:
                this.additionalFee = await paymentMethodComp.selectPurchaseOrder()
        }
        await paymentMethodComp.clickOnContinueBtn()
    }

    public async selectCashOnDeliveryPaymentMethod(): Promise<void> {
        await this.selectPaymentMethod(paymentMethods.cashOnDelivery)
        const checkoutPage: CheckoutPage = new CheckoutPage(this.page, this.testInfo)
        const paymentInformationComp: PaymentInformationComponent = checkoutPage.paymentInformationComp()
        await paymentInformationComp.clickOnContinueBtn()
    }

    public async selectCheckMoneyOrderPaymentMethod(): Promise<void> {
        const { checkMoneyOrderInstruction } = paymentInformationData
        await this.selectPaymentMethod(paymentMethods.check)
        const checkoutPage: CheckoutPage = new CheckoutPage(this.page, this.testInfo)
        const paymentInformationComp: PaymentInformationComponent = checkoutPage.paymentInformationComp()
        await expect(paymentInformationComp.paymentInstruction(checkMoneyOrderInstruction)).toBeVisible()
        await paymentInformationComp.clickOnContinueBtn()
        await checkoutPage.confirmOrderComp().waitForConfirmStep()
    }

    public async inputPaymentInfo(creditCard: CreditCard) {
        const checkoutPage: CheckoutPage = new CheckoutPage(this.page, this.testInfo)
        const paymentInformationComp: PaymentInformationComponent = checkoutPage.paymentInformationComp()
        await paymentInformationComp.selectCreditCardType(cardType[creditCard.type as CreditCardType])
        await paymentInformationComp.inputCardHolderName(creditCard.fullName)
        await paymentInformationComp.inputCardNumber(creditCard.cardNumber)
        let expiredDate = new Date(creditCard.date)
        await paymentInformationComp.selectExpireMonth(expiredDate.getMonth() + 1)
        await paymentInformationComp.selectExpireYear(expiredDate.getFullYear())
        await paymentInformationComp.inputCardCode(creditCard.cvv)

        await paymentInformationComp.clickOnContinueBtn()
    }

    public async confirmOrder() {
        const checkoutPage: CheckoutPage = new CheckoutPage(this.page, this.testInfo)
        const confirmOrderComp: ConfirmOrderComponent = await checkoutPage.confirmOrderComp()
        const priceCategoryList = await confirmOrderComp.totalComp().priceCategories()
        let subTotal = priceCategoryList["Sub-Total:"]
        let shipping = priceCategoryList["Shipping:"]
        let paymentMethodAdditionalFee = priceCategoryList["Payment method additional fee:"]
        let tax = priceCategoryList["Tax:"]
        let finalPrice = priceCategoryList["Total:"]

        expect(subTotal).toEqual(this.rawTotalPrice)
        expect(shipping).toEqual(this.shippingPrice)
        expect(paymentMethodAdditionalFee ?? 0).toEqual(this.additionalFee)
        if (paymentMethodAdditionalFee) {
            expect(subTotal + shipping + paymentMethodAdditionalFee + tax).toEqual(finalPrice)
        } else {
            expect(subTotal + shipping + tax).toEqual(finalPrice)
        }
        await confirmOrderComp.clickOnConfirmBtn()
    }

    public async checkoutCompleted() {
        const checkoutCompletedPage: CheckoutCompletedPage = new CheckoutCompletedPage(this.page, this.testInfo)
        const completedComp: CompletedComponent = await checkoutCompletedPage.orderCompletedComp()
        const { title, orderDetailLinkText } = orderCompletedData
        let orderNumber = await completedComp.getOrderNumber()
        expect(await completedComp.getOrderCompletedTitle()).toEqual(title)
        expect(await completedComp.getOrderDetailLinkText()).toEqual(orderDetailLinkText)
        expect(await completedComp.getOrderDetailLinkHref()).toEqual(`/orderdetails/${orderNumber}`)
    }

    public async verifyOrderDetailsPaymentMethod(paymentMethod: string): Promise<void> {
        const checkoutCompletedPage: CheckoutCompletedPage = new CheckoutCompletedPage(this.page, this.testInfo)
        await (await checkoutCompletedPage.orderCompletedComp()).clickOrderDetailsLink()

        const orderDetailsPage: OrderDetailsPage = new OrderDetailsPage(this.page, this.testInfo)
        expect(await orderDetailsPage.getPaymentMethod()).toContain(paymentMethod)
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

    private async calculateTotalRawPrice(selectedProcessorText: string | undefined,
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