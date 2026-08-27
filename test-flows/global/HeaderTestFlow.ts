import { expect } from "allure-playwright";
import BaseFlow from "../BaseFlow.js";

export default class HeaderTestFlow extends BaseFlow {

    async verifyShoppingCartQty() {
        const qty = this.page.locator(".cart-qty");
        await expect(qty).toHaveText("(1)");
    }
}
