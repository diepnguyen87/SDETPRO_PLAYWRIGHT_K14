import { test } from '@playwright/test'
import SearchComponent from '../../../models/components/global/header/SearchComponent.js'
import HomePage from '../../../models/pages/HomePage.js'

test('Advance POM - Component in page', async ({ page }, testInfo) => {
    await page.goto("/")
    let homePage: HomePage = new HomePage(page, testInfo)
    // let searchComp:SearchComponent = homePage.searchComp()
    // searchComp.searchInput().fill("enter something here")
    // searchComp.searchBtn().click()
})
