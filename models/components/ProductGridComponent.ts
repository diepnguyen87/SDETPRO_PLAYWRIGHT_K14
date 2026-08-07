import { Locator, Page, TestInfo } from "@playwright/test";
import ProductItemComponent from "./ProductItemComponent.js";
import Component from "./Component.js";

export default class ProductGridComponent extends Component {

    public static selector: string = ".product-grid"
    private productGridTitleSel = ".title"
    private productTitleSel = "h2.product-title"
    private actualPriceSel = "span.actual-price"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    title(): Locator {
        return this.componentLocator.locator(this.productGridTitleSel)
    }

    async productItemComp(): Promise<ProductItemComponent[]> {
        const productItemLocatorList = await this.componentLocator.locator(ProductItemComponent.selector).all();
        return productItemLocatorList.map(productItemLocator => new ProductItemComponent(productItemLocator))
    }
}