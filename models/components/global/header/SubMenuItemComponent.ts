import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../../SelectorDecorator.js";
import Component from "../../Component.js";

@selector("ul>li")
export default class SubMenuItemComponent extends Component {
    private subMenuItemSel: string = "a"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async getSubMenuItemHref(): Promise<string | null> {
        return await this.withHealing(this.subMenuItemSel, l => l.getAttribute("href"));
    }

    public async clickSubMenuItem(): Promise<void> {
        await this.withHealing(this.subMenuItemSel, l => l.click());
    }
}
