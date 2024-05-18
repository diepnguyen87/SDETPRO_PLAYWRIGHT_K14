import { Locator, Page } from "@playwright/test";
import BasePage from "./BasePage.js";
import TotalComponent from "../components/cart/TotalComponent.js";
import CartItemRowComponent from "../components/cart/CartItemRowComponent.js";

export default class ShoppingCartPage extends BasePage {

    constructor(page: Page) {
        super(page)
    }

    public async cartItemRowCompList(): Promise<CartItemRowComponent[]> {
        const cartItemRowLocatorList: Locator[] = await this.page.locator(CartItemRowComponent.selectorValue).all()
        return cartItemRowLocatorList.map(cartItemRowLocator => new CartItemRowComponent(cartItemRowLocator))
    }

    public totalComp(): TotalComponent {
        return new TotalComponent(this.page.locator(TotalComponent.selectorValue))
    }
}