import { test } from '@playwright/test'
import LoginPageMethod2 from '../../models/pages/LoginPageMethod2'

test('Traditional POM - Introducing Element/Locator', async ({ page }) => {
    await page.goto("https://the-internet.herokuapp.com/login")
    let loginPage: LoginPageMethod2 = new LoginPageMethod2(page)
    await loginPage.userName().fill("tomsmith")
    await loginPage.password().fill("SuperSecretPassword!")
    await loginPage.loginBtn().click()
    await page.waitForURL("**/secure")
})