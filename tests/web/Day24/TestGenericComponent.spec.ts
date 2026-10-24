import { test } from '@playwright/test'
import ComputerDetailPage from '../../../models/pages/ComputerDetailPage.js'
import StandardComputerComponent from '../../../models/components/computer/StandardComputerComponent.js'
import CheapComputerComponent from '../../../models/components/computer/CheapComputerComponent.js'

test('Test generic component', async ({ page }, testInfo) => {
    await page.goto("/build-your-cheap-own-computer")
    let computerDetailPage: ComputerDetailPage = new ComputerDetailPage(page, testInfo)
    let standardComputerComp = computerDetailPage.computerComponent(StandardComputerComponent)
    let cheapComputerComp = computerDetailPage.computerComponent(CheapComputerComponent)

    //await standardComputerComp.selectProcessor("enter processor type here")
    await cheapComputerComp.selectProcessorByName("Fast")
    await page.waitForTimeout(2 * 1000)
})