import { Locator, Page, TestInfo } from "@playwright/test";
import Component from "../Component.js";
import ProductImageWrapperComponent from "./ProductImageWrapperComponent.js";
import { selector } from "../SelectorDecorator.js";

@selector(".features_items")
export default class ProductListComponent extends Component {

    private titleHeading = this.componentLocator.getByRole('heading', { name: 'All Products' })

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async getTitle() {
        return await this.titleHeading.textContent();
    }

    public productImageWrapperComponentByName(productName: string) {
        const componentLocatorString: string = ProductImageWrapperComponent.selectorValue.replace("productName", productName)
        return new ProductImageWrapperComponent(this.page, this.componentLocator.locator(componentLocatorString), this.testInfo)
    }
}