import { test } from '@playwright/test'
import LoginPageMethod1 from '../../models/pages/LoginPageMethod1'

test('Traditional POM - interaction methods', async ({page}) => {
    await page.goto("https://the-internet.herokuapp.com/login")
    let loginPage:LoginPageMethod1 = new LoginPageMethod1(page)
    await loginPage.inputUserName("tomsmith")
    await loginPage.inputPassword("SuperSecretPassword!")
    await loginPage.clickOnLoginBtn()
    await page.waitForURL("**/secure")
})