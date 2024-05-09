import { Page } from "@playwright/test";
import ComputerDetailPage, { ComputerComponentConstructor } from "../../models/pages/ComputerDetailPage.js";
import ComputerEssentialComponent from "../../models/components/computer/ComputerEssentialComponent.js";

export default class OrderTestFlow {

    constructor(private page: Page, private computerComponentClass: ComputerComponentConstructor<ComputerEssentialComponent>) {
        this.page = page;
        this.computerComponentClass = computerComponentClass;
    }

    public async buildComputerDetailAndAddToCart() {
        const computerDetailPage: ComputerDetailPage = new ComputerDetailPage(this.page);
        const computerComponent: ComputerEssentialComponent = computerDetailPage.computerComponent(this.computerComponentClass);
        await computerComponent.selectProcessor("2.2 GHz Intel");
        await computerComponent.selectRAM("4GB");
        await computerComponent.selectHDD("400 GB");
        await computerComponent.selectOS("Windows 10")
        await computerComponent.selectSoftware("Acrobat Reader");

        await this.page.waitForTimeout(2 * 1000);
    }
}