import { test } from '@playwright/test'
import FooterTestFlow from '../../../test-flows/global/FooterTestFlow.js'

test('Test Footer Flow', async ({ page }, testInfo) => {
    await page.goto("https://demowebshop.tricentis.com/")
    let footerTestFlow: FooterTestFlow = new FooterTestFlow(page, testInfo)
    await footerTestFlow.verifyFooterComp('')
    await page.waitForTimeout(2 * 1000)
})