import { test } from '@playwright/test'

test('Login Test', async ({page}) => {
    await page.goto("https://playwright.dev/")
    await page.locator("teodepzai").click()
})