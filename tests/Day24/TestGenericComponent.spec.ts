import { test } from '@playwright/test'
import ComputerDetailPage from '../../models/pages/ComputerDetailPage.js'
import StandardComputerComponent from '../../models/components/computer/StandardComputerComponent.js'
import CheapComputerComponent from '../../models/components/computer/CheapComputerComponent.js'

test('Test generic component', async ({ page }) => {
    let computerDetailPage: ComputerDetailPage = new ComputerDetailPage(page)
    let standardComputerComp = computerDetailPage.computerComponent(StandardComputerComponent)
    let cheapComputerComp = computerDetailPage.computerComponent(CheapComputerComponent)

    //await standardComputerComp.selectProcessor("enter processor type here")
    await cheapComputerComp.selectProcessorByIndex("Fast")
    await page.waitForTimeout(2 * 1000)
})