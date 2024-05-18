import { Page } from "@playwright/test";
import CartItemRowComponent from "../../models/components/cart/CartItemRowComponent.js";
import ComputerEssentialComponent from "../../models/components/computer/ComputerEssentialComponent.js";
import ComputerDetailPage, { ComputerComponentConstructor } from "../../models/pages/ComputerDetailPage.js";
import ShoppingCartPage from "../../models/pages/ShoppingCartPage.js";
import { getAdditionalPriceByRegex } from "../../utils/RegexHelper.js";
import BaseFlow from "../BaseFlow.js";

export default class OrderTestFlow extends BaseFlow {

    private totalPrice: number = 0;

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

        this.totalPrice = await this.calculateTotalPrice(selectedProcessorText,
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

        this.totalPrice = await this.calculateTotalPrice(selectedProcessorText,
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

    public async showShoppingCart(): Promise<void> {
        const shoppingCartPage: ShoppingCartPage = new ShoppingCartPage(this.page)
        const cartItemRowCompList: CartItemRowComponent[] = await shoppingCartPage.cartItemRowCompList()
        for (const cartItemRowComp of cartItemRowCompList) {
            const unitPrice = await cartItemRowComp.getProductUnitPrice()
            const quantity = await cartItemRowComp.qualityInput().getAttribute('value');
            const subTotal = await cartItemRowComp.getProductSubTotal();
            console.log(`unitPrice: ${unitPrice}, quantity: ${quantity},  subTotal: ${subTotal}`);
        }

        console.log(await shoppingCartPage.totalComp().priceCategories());
    }

    private generateRandomIndex(maxIndex: number) {
        return Math.floor(Math.random() * maxIndex) + 1
    }

    private async selectRandomProcessor(computerComponent: ComputerEssentialComponent): Promise<string | undefined> {
        if (this.computerData.processor) {
            let randomProcessorIndex = this.generateRandomIndex(this.computerData.processor.length - 1)
            return await computerComponent.selectProcessorByIndex(randomProcessorIndex);
        }
    }

    private async selectRandomRAM(computerComponent: ComputerEssentialComponent): Promise<string | undefined> {
        if (this.computerData.RAM) {
            let randomRAMIndex = this.generateRandomIndex(this.computerData.RAM.length - 1)
            return await computerComponent.selectRAMByIndex(randomRAMIndex);
        }
    }

    private async selectRandomHDD(computerComponent: ComputerEssentialComponent): Promise<string | undefined> {
        if (this.computerData.HDD) {
            let randomHDDIndex = this.generateRandomIndex(this.computerData.HDD.length - 1)
            return await computerComponent.selectHDDByIndex(randomHDDIndex);
        }
    }

    private async selectRandomOS(computerComponent: ComputerEssentialComponent): Promise<string | undefined> {
        if (this.computerData.OS) {
            let randomOSIndex = this.generateRandomIndex(this.computerData.OS.length - 1)
            return await computerComponent.selectOSByIndex(randomOSIndex);
        }
    }

    private async selectRandomSoftware(computerComponent: ComputerEssentialComponent): Promise<string | undefined> {
        if (this.computerData.software) {
            let randomSoftwareIndex = this.generateRandomIndex(this.computerData.software.length - 1)
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