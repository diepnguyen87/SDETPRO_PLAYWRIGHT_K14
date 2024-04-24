import { test } from '@playwright/test'
import FooterTestFlow from '../../test-flows/global/footerTestFlow'

test('Test Footer Flow', async ({ page }) => {
    await page.goto("https://demowebshop.tricentis.com/")
    let footerTestFlow: FooterTestFlow = new FooterTestFlow(page)
    await footerTestFlow.verifyFooterComp()
    
    await page.waitForTimeout(2 * 1000)
})