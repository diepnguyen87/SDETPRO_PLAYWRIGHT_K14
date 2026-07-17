import { test } from '@playwright/test'
import HeaderComponent from '../../models/components/global/header/HeaderComponent'
import SearchComponent from '../../models/components/global/header/SearchComponent'
import HomePage from '../../models/pages/HomePage'

test('Advance POM - Component in Parent component', async ({ page }) => {
    await page.goto("https://demowebshop.tricentis.com/")
    let homePage: HomePage = new HomePage(page)
    let headerComp: HeaderComponent = homePage.headerComp()
    let searchComp: SearchComponent = headerComp.searchComp();

    searchComp.searchInput().fill("enter something here")
    searchComp.searchBtn().click()

    await page.waitForTimeout(1 * 1000)
})
