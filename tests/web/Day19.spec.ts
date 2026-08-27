import { test } from '@playwright/test'
import ProductFlow from '../../test-flows/ProductFlow.spect.js'


test.only('Pratice Locator', async ({ page }, testInfo) => {
    await page.goto("https://demowebshop.tricentis.com/desktops")
    // await page.getByLabel('Email:').fill('email@gmail.com')
    // await page.getByLabel('Password:').fill('password')
    // await page.getByRole('button', { name: 'Log in' }).click()
    // await page.getByText('Forgot password?').click()
    // await page.getByRole('link', {name: 'Register'}).click();
    // await page.getByRole('link', {name: 'Shopping cart',  exact: true}).click();
    // await page.locator('#small-searchterms').fill('Apple');
    // await page.getByRole('checkbox', {name: 'Remember me?'}).click()
    // const cheapProduct = await page.locator('.product-item').filter({hasText: 'Build your own cheap computer'});
    // cheapProduct.getByRole('button', {name: 'Add to cart'}).click();
    const productFlow: ProductFlow = new ProductFlow(page, testInfo);

    await productFlow.addToCart("Build your own computer");
    console.log(await productFlow.verifyShoppingCartQty());
})

test('Link Text - Xpath', async ({ page }) => {
    await page.goto("https://the-internet.herokuapp.com/")
    const dragDropElem = await page.waitForSelector("//a[text()='Drag and Drop']", { timeout: 10 * 1000 })
    await dragDropElem.click()
    await page.waitForTimeout(3 * 1000)
})

test('Link Text - CSS', async ({ page }) => {
    await page.goto("https://the-internet.herokuapp.com/")
    const dragDropElem = await page.locator("a:has-text('Drag and Drop')")
    await dragDropElem.click()
    await page.waitForTimeout(3 * 1000)
})

test('Link Text - Filtering', async ({ page }) => {
    await page.goto("https://the-internet.herokuapp.com/")
    const elementalElem = await page.locator("//a").filter({ hasText: "Elemental1" })
    elementalElem.scrollIntoViewIfNeeded()
    await page.waitForTimeout(3 * 1000)

    await elementalElem.click()
    await page.waitForTimeout(3 * 1000)
})

test('Multiple matching', async ({ page }) => {
    await page.goto("https://the-internet.herokuapp.com/")
    const hyperlinkElems = await page.locator("//a").elementHandles()
    await hyperlinkElems[10].click()
    await page.waitForTimeout(3 * 1000)
})

test('Login Form', async ({ page }) => {
    await page.goto("https://the-internet.herokuapp.com/")
    const formAuthenElem = await page.locator("a:has-text('Form Authentication')")
    await formAuthenElem.click()
    await page.waitForLoadState("domcontentloaded")

    await page.locator("input#username").fill("teodepzai")
    await page.locator("input#password").fill("123456789")
    await page.waitForTimeout(1 * 1000)

    await page.locator("button[type='submit']").click()
    await page.waitForTimeout(3 * 1000)
})

test('Get Text', async ({ page }) => {
    await page.goto("https://the-internet.herokuapp.com/")
    const formAuthenElem = await page.locator("a:has-text('Form Authentication')")
    await formAuthenElem.click()
    await page.waitForLoadState("domcontentloaded")

    await page.locator("input#username").fill("teodepzai")
    await page.locator("input#password").fill("123456789")
    await page.waitForTimeout(1 * 1000)

    await page.locator("button[type='submit']").click()
    const loginHeaderElem = await page.locator("h4.subheader")
    const textContent = await loginHeaderElem.textContent()
    const innerText = await loginHeaderElem.innerText()

    console.log("Text content: " + textContent);
    console.log("Inner text: " + innerText);
    await page.waitForTimeout(3 * 1000)
})
