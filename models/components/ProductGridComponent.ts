import { Locator, Page, TestInfo } from "@playwright/test";
import ProductItemComponent from "./ProductItemComponent.js";
import { selector } from "./SelectorDecorator.js";
import Component from "./Component.js";

@selector(".product-grid")
export default class ProductGridComponent extends Component {

    private productGridTitleSel = ".title"
    private productTitleSel = "h2.product-title"
    private actualPriceSel = "span.actual-price"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async getTitle(): Promise<string | null> {
        return await this.withHealing(this.productGridTitleSel, l => l.textContent())
    }

    async productItemComp(): Promise<ProductItemComponent[]> {
        const productItemLocatorList = await this.componentLocator.locator(ProductItemComponent.selectorValue).all();
        return productItemLocatorList.map(productItemLocator => new ProductItemComponent(this.page, productItemLocator, this.testInfo))
    }
}