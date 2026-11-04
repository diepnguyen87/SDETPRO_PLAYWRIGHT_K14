import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../../SelectorDecorator.js";
import Component from "../../Component.js";
import MenuItemComponent from "./MenuItemComponent.js";

@selector(".top-menu")
export default class TopMenuComponent extends Component {

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async menuItemList(): Promise<MenuItemComponent[]> {
        let menuItemLocatorList = await this.componentLocator.locator(MenuItemComponent.selectorValue).all()
        return menuItemLocatorList.map(locator => {
            return new MenuItemComponent(this.page, locator, this.testInfo)
        })
    }
}
