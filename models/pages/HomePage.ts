import { Page } from "@playwright/test";
import SearchComponent from "../components/SearchComponent";
import ProductItemComponent from "../components/ProductItemComponent";

export default class HomePage {

    constructor(private page: Page) {
        this.page = page
    }

    searchComp(): SearchComponent {
        return new SearchComponent(this.page.locator(SearchComponent.searchBoxSel));
    }

    async productItemComp(): Promise<ProductItemComponent[]> {
        const productItemLocatorList = await this.page.locator(ProductItemComponent.selector).all();
        return productItemLocatorList.map(productItemLocator => new ProductItemComponent(productItemLocator))
    }
}