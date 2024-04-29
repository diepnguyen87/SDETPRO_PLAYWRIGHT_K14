import { Locator } from "@playwright/test";
import ProductItemComponent from "./ProductItemComponent.js";

export default class ProductGridComponent {

    public static selector: string = ".product-grid"
    private productGridTitleSel = ".title"
    private productTitleSel = "h2.product-title"
    private actualPriceSel = "span.actual-price"

    constructor(private component: Locator) {
        this.component = component
    }

    title(): Locator {
        return this.component.locator(this.productGridTitleSel)
    }

    async productItemComp(): Promise<ProductItemComponent[]> {
        const productItemLocatorList = await this.component.locator(ProductItemComponent.selector).all();
        return productItemLocatorList.map(productItemLocator => new ProductItemComponent(productItemLocator))
    }
}