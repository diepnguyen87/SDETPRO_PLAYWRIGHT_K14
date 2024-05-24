import { Locator } from "@playwright/test";
import SearchComponent from "./SearchComponent.js";
import { selector } from "../../SelectorDecorator.js";

@selector(".header")
export default class HeaderComponent {

    private shoppingCartLinkSel: string = ".header-links .ico-cart"

    constructor(private component: Locator) {
        this.component = component;
    }

    searchComp(): SearchComponent {
        return new SearchComponent(this.component.locator(SearchComponent.selector));
    }

    public async navigateToShoppingCartLink(): Promise<void> {
        await this.component.locator(this.shoppingCartLinkSel).click()
    }
}