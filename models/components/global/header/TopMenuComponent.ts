import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../../SelectorDecorator.js";
import Component from "../../Component.js";

@selector(".top-menu")
export default class TopMenuComponent extends Component {

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async menuItemList(): Promise<MenuItemComponent[]> {
        let menuItemLocatorList = await this.componentLocator.locator(MenuItemComponent.selector).all()
        return menuItemLocatorList.map(locator => {
            return new MenuItemComponent(locator)
        })
    }
}

export class MenuItemComponent {
    public static selector: string = ">li"
    private menuItemSel: string = ">a"

    constructor(private component: Locator) {
        this.component = component
    }

    public menuItem(): Locator {
        return this.component.locator(this.menuItemSel);
    }

    public async subMenuItemList(): Promise<SubMenuItemComponent[]> {
        let menuItemLocatorList = await this.component.locator(SubMenuItemComponent.selector).all()
        return menuItemLocatorList.map(locator => {
            return new SubMenuItemComponent(locator)
        })
    }
}

export class SubMenuItemComponent {
    public static selector: string = "ul>li"

    constructor(private component: Locator) {
        this.component = component
    }

    public subMenuItem(): Locator {
        return this.component.locator("a")
    }
}
