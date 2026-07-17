import { test } from '@playwright/test'
import pages from '../../test-data/pages.json' assert { type: "json" };
import FooterTestFlow from '../../test-flows/global/FooterTestFlow.js'
import { Urls } from '../../url/Urls.js'

pages.forEach(pageObj => {
    test.only(`Test Footer Flow on ${pageObj.pageName}`, async ({ page }) => {
        await page.goto(`${Urls.baseURL.concat(pageObj.slug)}`);
        let footerTestFlow: FooterTestFlow = new FooterTestFlow(page);
        await footerTestFlow.verifyFooterComp(pageObj.slug);
        await page.waitForTimeout(2 * 1000);
    })
});

test(`Test Footer Flow`, async ({ page }) => {
    await page.goto(Urls.baseURL);
    let footerTestFlow: FooterTestFlow = new FooterTestFlow(page)

    let slug = await footerTestFlow.navigateToRandomMenuItem()
    await footerTestFlow.verifyFooterCompByRandomCategoryPage(slug)

    await page.waitForTimeout(3 * 1000);
})