import { test } from '@playwright/test'
import ProductItemComponent from '../../models/components/ProductItemComponent'
import HomePage from '../../models/pages/HomePage'

test('Advance POM - Component in page', async ({ page }) => {
    await page.goto("https://demowebshop.tricentis.com/")
    let homePage: HomePage = new HomePage(page)
    let productItemCompList: ProductItemComponent[] = await homePage.productItemComp()
    for (const productItemComp of productItemCompList) {
        let productTitle = await productItemComp.getProductTitle().textContent()
        let actualPrice = await productItemComp.actualPrice().textContent()
        productTitle = productTitle != null ? productTitle.trim() : productTitle
        actualPrice = actualPrice != null ? actualPrice.trim() : actualPrice

        console.log(`${productTitle} - ${actualPrice}`);
    }
})
