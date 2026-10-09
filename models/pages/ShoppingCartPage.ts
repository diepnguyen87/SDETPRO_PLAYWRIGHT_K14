import { Locator, Page, TestInfo } from "@playwright/test";
import BasePage from "./BasePage.js";
import TotalComponent from "../components/cart/TotalComponent.js";
import CartItemRowComponent from "../components/cart/CartItemRowComponent.js";

export default class ShoppingCartPage extends BasePage {

    private readonly tosWarningMessageSel = "#terms-of-service-warning-box"
    private readonly tosWarningCloseBtnName = "close"
    private readonly updateCartBtnName = "Update shopping cart"

    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo)
    }

    public async cartItemRowCompList(): Promise<CartItemRowComponent[]> {
        const cartItemRowLocatorList: Locator[] = await this.page.locator(CartItemRowComponent.selectorValue).all()
        return cartItemRowLocatorList.map(cartItemRowLocator => new CartItemRowComponent(this.page, cartItemRowLocator, this.testInfo))
    }

    public totalComp(): TotalComponent {
        return new TotalComponent(this.page, this.page.locator(TotalComponent.selectorValue), this.testInfo)
    }

    public tosWarningDialog(title: string): Locator {
        return this.page.getByRole("dialog", { name: title })
    }

    public async getTosWarningMessage(): Promise<string> {
        return (await this.withHealing(this.tosWarningMessageSel, l => l.innerText())).trim()
    }

    public async closeTosWarningDialog(title: string): Promise<void> {
        await this.tosWarningDialog(title).getByRole("button", { name: this.tosWarningCloseBtnName }).click()
    }

    public async removeAllItems(): Promise<void> {
        const rows = await this.cartItemRowCompList()
        if (rows.length === 0) return
        for (const row of rows) {
            await row.selectRemove()
        }
        await this.page.getByRole("button", { name: this.updateCartBtnName }).click()
    }
}