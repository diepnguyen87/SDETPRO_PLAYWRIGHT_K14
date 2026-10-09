import { Page, TestInfo, expect } from "@playwright/test";
import BasePage from "../models/pages/BasePage.js";
import HeaderComponent from "../models/components/global/header/HeaderComponent.js";
import ShoppingCartPage from "../models/pages/ShoppingCartPage.js";
import LoggerManager from "../utils/LoggerManager.js";
import pages from "../test-data/pages.json" assert { type: "json" };

type PageConstructor<T extends BasePage> = new (page: Page, testInfo: TestInfo) => T

export default class BaseFlow {

    constructor(protected page: Page, protected testInfo: TestInfo) {
        this.page = page
        this.testInfo = testInfo
    }

    private initPageInstance<T extends BasePage>(className: PageConstructor<T>): T {
        return new className(this.page, this.testInfo)
    }

    public async createPageInstance(className: string) {
        const dynamicImport = await import(`../models/pages/${className}.js`)
        const Class = dynamicImport.default

        if (Class) {
            return this.initPageInstance(Class)
        } else {
            throw new Error(`Class '${className}' not found`);
        }
    }


    public async getClassNameBySlug(slug: string): Promise<string> {
        const pageObj = pages.find(p => p.slug === slug)
        if (!pageObj) {
            throw new Error(`The slug ${slug} does not map with any class name`)
        }
        return pageObj.className
    }

    public async navigateToShoppingCartPage(): Promise<void> {
        await new HeaderComponent(this.page, this.page.locator(HeaderComponent.selectorValue), this.testInfo).navigateToShoppingCartLink()
    }

    public async clearShoppingCart(): Promise<void> {
        const logger = LoggerManager.getLogger(this.testInfo)
        logger.info("Cleanup: clearing shopping cart")
        await this.navigateToShoppingCartPage()
        await expect(this.page).toHaveURL(/\/cart$/)
        const shoppingCartPage: ShoppingCartPage = new ShoppingCartPage(this.page, this.testInfo)
        await shoppingCartPage.removeAllItems()
        await expect.poll(() => shoppingCartPage.headerComp().getCartQty()).toBe(0)
        logger.info("Cleanup: shopping cart is empty")
    }
}