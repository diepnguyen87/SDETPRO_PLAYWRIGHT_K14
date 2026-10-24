import { Page } from '@playwright/test'

declare const googletag: any;

export async function getAdsParam(page: Page, adSlot: string) {
    await page.waitForFunction(() => typeof googletag.pubads === 'function');

    return await page.evaluate((adSlot) => {
        const googleAdsElem = googletag.pubads().getSlots().find(({ getSlotElementId }: { getSlotElementId: () => string }) => getSlotElementId() === adSlot)
        return googleAdsElem.getTargetingMap()
    }, adSlot)
}