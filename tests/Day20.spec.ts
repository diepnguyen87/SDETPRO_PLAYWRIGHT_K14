import { test } from '@playwright/test'

test('Handle dropdown', async ({ page }) => {
    await page.goto("https://the-internet.herokuapp.com/dropdown")
    const dropdownElem = await page.locator("select#dropdown")
    await dropdownElem.selectOption({ value: "2" })
    await page.waitForTimeout(2 * 1000);

    await dropdownElem.selectOption({ label: "Option 1" })
    await page.waitForTimeout(2 * 1000)
})

test('Handle iframe', async ({ page }) => {
    await page.goto("https://the-internet.herokuapp.com/iframe")
    const iframeElem = await page.frameLocator('iframe[id^="mce"]')
    const textAreaElem = await iframeElem.locator("body p")

    await textAreaElem.click()
    await textAreaElem.clear()
    await textAreaElem.fill("New content here")
    await page.waitForTimeout(2 * 1000)

    const powerByElem = await page.locator('a:has-text("Elemental")')
    powerByElem.click()
})

test('Hover to elements', async ({ page }) => {
    await page.goto("https://the-internet.herokuapp.com/hovers")
    const figureElemList = await page.locator("div#content div.figure").all()
    for (const figureElem of figureElemList) {
        const figureImageElem = await figureElem.locator("img")
        await figureElem.hover()
        await page.waitForTimeout(1 * 1000)
    }
})

test.only('Handle dynamic controls', async ({ page }) => {
    await page.goto("https://the-internet.herokuapp.com/dynamic_controls")
    const checkboxComp = await page.locator("form#checkbox-example")
    const inputComp = await page.locator("form#input-example")

    //Handle checkbox status
    const checkboxElem = await checkboxComp.locator("div#checkbox input")
    let isEnable = await checkboxElem.isEnabled()
    let isChecked = await checkboxElem.isChecked()

    if (!isChecked && isEnable) {
        checkboxElem.click()
    }
    await page.waitForTimeout(1 * 1000)

    isEnable = await checkboxElem.isEnabled()
    isChecked = await checkboxElem.isChecked()
    if (!isChecked && isEnable) {
        checkboxElem.click()
    }
    await page.waitForTimeout(1 * 1000)

    //Handle dynamic [Remove] button
    const removeButtonElem = await checkboxComp.locator("button")
    await removeButtonElem.click()
    await page.waitForSelector('form#checkbox-example div#checkbox input', { state: 'hidden', timeout: 5 * 1000 })

    //Handle dynamic [Enabled] button
    let inputElem = await inputComp.locator("input")
    const enableButtomElem = await inputComp.locator("button")

    let isEditable = await inputElem.isEditable()
    console.log("isEditableBefore: " + isEditable);
    if (isEditable) {
        inputElem.fill("Hello everyone!")
    }
    await page.waitForTimeout(3 * 1000)

    await enableButtomElem.click()
    await page.waitForSelector('p#message', { timeout: 5 * 1000 })

    isEditable = await inputElem.isEditable()
    console.log("isEditableAfter: " + isEditable);
    if (isEditable) {
        inputElem.fill("Hello everyone!")
    }

    await page.waitForTimeout(3 * 1000)
})