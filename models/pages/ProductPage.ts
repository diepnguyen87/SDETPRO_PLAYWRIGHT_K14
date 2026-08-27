import { Page, TestInfo } from "@playwright/test"
import BasePage from "./BasePage.js"
import ProductComponent from "../components/ProductComponent.js"

export default class ProductPage extends BasePage {

    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo)
    }

    productComp(): ProductComponent {
        return new ProductComponent(this.page);
    }
}