import { Locator, Page, TestInfo } from "@playwright/test";
import SearchComponent from "./SearchComponent.js";
import { selector } from "../../SelectorDecorator.js";
import Component from "../../Component.js";

@selector(".header")
export default class HeaderComponent extends Component {

    private shoppingCartLinkSel: string = ".header-links .ico-cart"
    private cartQtySel: string = ".ico-cart .cart-qty"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    searchComp(): SearchComponent {
        return new SearchComponent(this.page, this.componentLocator.locator(SearchComponent.selector), this.testInfo);
    }

    public async navigateToShoppingCartLink(): Promise<void> {
        await this.componentLocator.locator(this.shoppingCartLinkSel).click()
    }

    public async getCartQty(): Promise<number> {
        const cartQtytext = await this.componentLocator.locator(this.cartQtySel).textContent();
        return Number(cartQtytext?.match(/\d+/)?.[0]);
    }
}