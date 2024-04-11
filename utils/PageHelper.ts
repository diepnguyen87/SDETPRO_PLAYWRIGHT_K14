import { Page } from '@playwright/test'

export async function scrollDownByPercentage(page: Page, percent: number) {
    await page.evaluate((percentageScroll) => {
        window.scrollTo(0, percentageScroll * document.body.scrollHeight)
    }, percent)
}