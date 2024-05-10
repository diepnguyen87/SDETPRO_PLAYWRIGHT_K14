import { Page } from "@playwright/test";
import ComputerEssentialComponent from "../../models/components/computer/ComputerEssentialComponent.js";
import ComputerDetailPage, { ComputerComponentConstructor } from "../../models/pages/ComputerDetailPage.js";
import { getAdditionalPriceByRegex } from "../../utils/RegexHelper.js";

export default class OrderTestFlow {

    private totalPrice: number = 0;

    constructor(private page: Page, private computerComponentClass: ComputerComponentConstructor<ComputerEssentialComponent>) {
        this.page = page;
        this.computerComponentClass = computerComponentClass;
    }

    public async buildComputerDetailAndAddToCart() {
        const computerDetailPage: ComputerDetailPage = new ComputerDetailPage(this.page);
        const computerComponent: ComputerEssentialComponent = computerDetailPage.computerComponent(this.computerComponentClass);
        computerComponent.unselectDefaultCheckbox();

        const selectedProcessor = await computerComponent.selectProcessor("2.2 GHz Intel");
        const selectedRAM = await computerComponent.selectRAM("4GB");
        const selectedHDD = await computerComponent.selectHDD("400 GB");
        const selectedOS = await computerComponent.selectOS("Windows 10")
        const selectedSoftware = await computerComponent.selectSoftware("Acrobat Reader");

        const processorAdditionalPrice = getAdditionalPriceByRegex(selectedProcessor)
        const ramAdditionalPrice = getAdditionalPriceByRegex(selectedRAM)
        const hddAdditionalPrice = getAdditionalPriceByRegex(selectedHDD)
        const osAdditionalPrice = getAdditionalPriceByRegex(selectedOS)
        const softwareAdditionalprice = getAdditionalPriceByRegex(selectedSoftware)

        const basePrice = await computerComponent.getProductPrice();
        const totalAdditionalPrice = processorAdditionalPrice
            + ramAdditionalPrice
            + hddAdditionalPrice
            + osAdditionalPrice
            + softwareAdditionalprice
        this.totalPrice = basePrice + totalAdditionalPrice

        computerComponent.clickOnAddToCartBtn()
        const contentMsg = await computerDetailPage.notificationComp().getContentMessage()
        if (contentMsg === "The product has been added to your shopping cart") {
            computerComponent.clickOnAddToCartBtn()
        } else {
            throw new Error("Add to cart failed");
        }

        await this.page.waitForTimeout(2 * 1000);
    }
}