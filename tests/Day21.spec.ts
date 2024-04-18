import { test } from '@playwright/test'
import { scrollDownByPercentage } from '../utils/PageHelper'
import { getAdsParam } from '../utils/GoogleAdHelper'

const jsAlertURL = "https://the-internet.herokuapp.com/javascript_alerts"
const floatingMenuURL = "https://the-internet.herokuapp.com/floating_menu"

test('Handling JS Alert automatically', async ({ page }) => {
    await page.goto(jsAlertURL)
    await page.locator('button[onclick="jsAlert()"]').click()
    await page.waitForTimeout(2 * 1000)
})


test('Handling JS Alert with event', async ({ page }) => {
    await page.goto(jsAlertURL)
    await page.on('dialog', dialog => {
        dialog.accept()
    })
    await page.locator('button[onclick="jsAlert()"]').click()
    await page.waitForTimeout(2 * 1000)
})

test('Handling JS Confirm with event', async ({ page }) => {
    await page.goto(jsAlertURL)
    await page.on('dialog', dialog => {
        dialog.dismiss()
    })
    await page.locator('button[onclick="jsConfirm()"]').click()
    await page.waitForTimeout(2 * 1000)
})

test('Handling JS Prompt with event', async ({ page }) => {
    await page.goto(jsAlertURL)
    await page.on('dialog', dialog => {
        console.log("Alert Prompt message: " + dialog.message());
        dialog.accept("Hello everyone,")
    })
    await page.locator('button[onclick="jsPrompt()"]').click()
    await page.waitForTimeout(2 * 1000)
})

test('Handling javascript without parameter', async ({ page }) => {
    await page.goto(floatingMenuURL)

    //scroll down
    await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
    })
    await page.waitForTimeout(2 * 1000)

    //scroll up
    await page.evaluate(() => {
        window.scrollTo(0, 0)
    })
    await page.waitForTimeout(2 * 1000)
})

test('Handling javascript with parameter', async ({ page }) => {
    await page.goto(floatingMenuURL)

    await scrollDownByPercentage(page, 0.5)
    await page.waitForTimeout(2 * 1000)

    //scroll up
    await page.evaluate(() => {
        window.scrollTo(0, 0)
    })
    await page.waitForTimeout(2 * 1000)
})

test.only('Handling javascript and return value', async ({ page }) => {
    await page.goto("https://www.foodandwine.com/")
    console.log(await getAdsParam(page, 'leaderboard-flex-1'));
})