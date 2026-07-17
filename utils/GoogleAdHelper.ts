import { Page } from '@playwright/test'

export async function getAdsParam(page: Page, adSlot: string) {
    await page.waitForFunction(() => typeof googletag.pubads === 'function');

    return await page.evaluate((adSlot) => {
        const googleAdsElem = googletag.pubads().getSlots().find(({ getSlotElementId }) => getSlotElementId() === adSlot)
        return googleAdsElem.getTargetingMap()
    }, adSlot)
}