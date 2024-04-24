import { test } from '@playwright/test'
import PageBodyComponent from '../../models/components/PageBodyComponent'
import ProductItemComponent from '../../models/components/ProductItemComponent'
import HomePage from '../../models/pages/HomePage'
import ProductGridComponent from '../../models/components/ProductGridComponent'

test('Advance POM - List components in parent component', async ({ page }) => {
    await page.goto("https://demowebshop.tricentis.com/")
    let homePage: HomePage = new HomePage(page)
    let pageBodyComp: PageBodyComponent = homePage.pageBodyComp();
    let productGridComp:ProductGridComponent = pageBodyComp.productGridComp();
    let productItemCompList: ProductItemComponent[] = await productGridComp.productItemComp()

    for (const productItemComp of productItemCompList) {
        let productTitle = await productItemComp.getProductTitle().textContent()
        let actualPrice = await productItemComp.actualPrice().textContent()
        productTitle = productTitle != null ? productTitle.trim() : productTitle
        actualPrice = actualPrice != null ? actualPrice.trim() : actualPrice

        console.log(`${productTitle} - ${actualPrice}`);
    }
})
