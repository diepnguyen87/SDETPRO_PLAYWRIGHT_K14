import { expect, Locator, Page } from "@playwright/test";

export default class ProductComponent {

    constructor(private page: Page) { }

    getProductLocatorByName(productName: string): Locator {
        const selectedProductLocator = this.page.locator('.product-item').filter({
            has: this.page.getByRole('heading', {
                name: productName,
                exact: true
            })
        });
        return selectedProductLocator;
    }

    getAddToCartLocator(selectedProductLocator: Locator): Locator {
        return selectedProductLocator.getByRole('button', { name: 'Add to cart' })
    }

    getPrice(selectedProductLocator: Locator): Promise<string | null> {
        return selectedProductLocator.locator('.price.actual-price').textContent();
    }
}