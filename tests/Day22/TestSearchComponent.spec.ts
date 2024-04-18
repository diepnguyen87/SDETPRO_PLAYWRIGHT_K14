import { test } from '@playwright/test'
import HomePage from '../../models/pages/HomePage'
import SearchComponent from '../../models/components/SearchComponent'

test('Advance POM - Component in page', async ({ page }) => {
    await page.goto("https://demowebshop.tricentis.com/")
    let homePage: HomePage = new HomePage(page)
    let searchComp:SearchComponent = homePage.searchComp()
    searchComp.searchInput().fill("enter something here")
    searchComp.searchBtn().click()
})
