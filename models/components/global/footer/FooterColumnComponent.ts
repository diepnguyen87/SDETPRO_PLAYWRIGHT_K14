import { Locator, Page, TestInfo } from "@playwright/test";
import Component from "../../Component.js";

export default class FooterColumnComponent extends Component {

    private titleSel: string = "h3"
    private linksSel: string = "li>a"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
        this.componentLocator.scrollIntoViewIfNeeded()
    }

    title(): Locator {
        return this.componentLocator.locator(this.titleSel)
    }

    async links(): Promise<Locator[]> {
        return await this.componentLocator.locator(this.linksSel).all()
    }
}