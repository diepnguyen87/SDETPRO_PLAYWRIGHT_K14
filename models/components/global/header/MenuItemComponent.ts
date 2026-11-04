import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../../SelectorDecorator.js";
import Component from "../../Component.js";
import SubMenuItemComponent from "./SubMenuItemComponent.js";

@selector(">li")
export default class MenuItemComponent extends Component {
    private menuItemSel: string = ">a"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async hoverMenuItem(): Promise<void> {
        await this.withHealing(this.menuItemSel, l => l.hover());
    }

    public async getMenuItemHref(): Promise<string | null> {
        return await this.withHealing(this.menuItemSel, l => l.getAttribute("href"));
    }

    public async clickMenuItem(): Promise<void> {
        await this.withHealing(this.menuItemSel, l => l.click());
    }

    public async subMenuItemList(): Promise<SubMenuItemComponent[]> {
        let menuItemLocatorList = await this.componentLocator.locator(SubMenuItemComponent.selectorValue).all()
        return menuItemLocatorList.map(locator => {
            return new SubMenuItemComponent(this.page, locator, this.testInfo)
        })
    }
}
