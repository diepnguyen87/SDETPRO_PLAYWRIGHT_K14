import { Locator, Page, TestInfo } from "@playwright/test";
import Component from "../../Component.js";

export default class FooterColumnComponent extends Component {

    private titleSel: string = "h3"
    private linksSel: string = "li>a"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async getTitle(): Promise<string | null> {
        return await this.withHealing(this.titleSel, l => l.textContent())
    }

    public async getLinkTexts(): Promise<string[]> {
        return await this.withHealing(this.linksSel, async l => {
            await l.first().waitFor();
            return await l.allTextContents();
        })
    }

    public async getLinkHrefs(): Promise<string[]> {
        return await this.withHealing(this.linksSel, async l => {
            await l.first().waitFor();
            const hrefs = await l.evaluateAll(links => links.map(link => link.getAttribute("href")));
            return hrefs.filter((href): href is string => href !== null);
        })
    }
}