import { Locator, Page, TestInfo } from "@playwright/test";
import BasePage from "./BasePage.js";
import TotalComponent from "../components/cart/TotalComponent.js";
import CartItemRowComponent from "../components/cart/CartItemRowComponent.js";

export default class ShoppingCartPage extends BasePage {

    private readonly tosWarningMessageSel = "#terms-of-service-warning-box"
    private readonly tosWarningCloseBtnName = "close"
    private readonly updateCartBtnName = "Update shopping cart"
    private readonly emptyCartMessageSel = ".order-summary-content"
    private readonly updateCartRequestUrl = "**/cart"

    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo)
    }

    public async getCartItemRowCount(): Promise<number> {
        await this.ensureLoaded()
        return await this.withHealing(CartItemRowComponent.selectorValue, l => l.count())
    }

    public updateCartBtn(): Locator {
        return this.page.getByRole("button", { name: this.updateCartBtnName })
    }

    public async clickOnUpdateCartBtn(): Promise<void> {
        await this.ensureLoaded()
        await this.updateCartBtn().click()
    }

    public async getEmptyCartMessage(): Promise<string> {
        await this.ensureLoaded()
        return (await this.withHealing(this.emptyCartMessageSel, l => l.innerText())).trim()
    }

    // Aborts the next cart update POST to simulate a failed removal, then leaves the browser error page.
    // The POST targets the current URL, so the error page replaces the /cart history entry and goBack()
    // lands on the page visited before the cart: reopen the cart from the header afterwards.
    public async submitUpdateCartWithFailedRequest(): Promise<void> {
        await this.ensureLoaded()
        await this.page.route(this.updateCartRequestUrl,
            route => route.request().method() === "POST" ? route.abort("failed") : route.fallback(),
            { times: 1 })
        await Promise.all([
            this.page.waitForEvent("requestfailed", request => request.method() === "POST"),
            this.page.waitForEvent("framenavigated", frame => frame === this.page.mainFrame()),
            this.updateCartBtn().click()
        ])
        await this.page.unroute(this.updateCartRequestUrl)
        await this.page.goBack()
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
        await this.clickOnUpdateCartBtn()
    }
}