import { Page, TestInfo } from "@playwright/test";
import BasePage from "./BasePage.js";
import { Product } from "../../test-data/model/Product.js";

export default class ViewCartPage extends BasePage {
    
    private proceedToCheckoutBtn = this.page.getByRole('button', {name: 'Proceed To Checkout'});
    private selectedProductList = this.page.locator('.table tbody tr');

    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo)
    }

    public async getSelectedProductList(){
        const productList = await this.selectedProductList.elementHandles();
        const products: Product[] = [];
        for (const productItem of productList) {
            products.push({
                image: "",
                description: `productItem.$('td.description')`,
                price: `productItem.$('td.price')`,
                quantity: `productItem.$('td.quantity')`,
                total: ""
            })
    }
}