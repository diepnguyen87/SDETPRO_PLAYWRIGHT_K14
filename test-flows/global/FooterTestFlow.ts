import { Locator, Page } from "@playwright/test";
import { deepStrictEqual } from 'assert';
import FooterColumnComponent from "../../models/components/global/footer/FooterColumnComponent.js";
import FooterComponent from "../../models/components/global/footer/FooterComponent.js";
import HomePage from '../../models/pages/HomePage.js';
import BaseFlow from "../BaseFlow.js";
import { MenuItemComponent, SubMenuItemComponent } from "../../models/components/global/header/TopMenuComponent.js";

export default class FooterTestFlow extends BaseFlow {

    constructor(page: Page) {
        super(page)
    }

    async verifyFooterCompByRandomCategoryPage(slug: string) {
        let className: string = await this.getClassNameBySlug(slug)
        let pageObject = await this.createPageInstance(className)
        let footerComp: FooterComponent = pageObject.footerComp()

        await this.verifyInformationColumn(footerComp.informationColumnComp())
        await this.verifyCustomerServiceColumn(footerComp.customerServiceColumnComp())
        await this.verifyMyAccountColumn(footerComp.myAccountColumnComp())
        await this.verifyFollowUsColumn(footerComp.followUsColumnComp())
    }

    async navigateToRandomMenuItem(): Promise<string> {
        let homePage: HomePage = new HomePage(this.page)
        let menuItemCompList: MenuItemComponent[] = await homePage.topMenuComp().menuItemList()

        let randomMenuIndex = Math.floor(Math.random() * menuItemCompList.length)
        let randomMenuItemComp = menuItemCompList[randomMenuIndex]
        let randomMenuItem = await randomMenuItemComp.menuItem()
        await randomMenuItem.hover()

        let subMenuItemList: SubMenuItemComponent[] = await randomMenuItemComp.subMenuItemList()
        let href = null
        if (subMenuItemList.length != 0) {
            let randomSubCategoryIndex = Math.floor(Math.random() * subMenuItemList.length)
            let randomSubMenuItem: Locator = subMenuItemList[randomSubCategoryIndex].subMenuItem()
            href = randomSubMenuItem.getAttribute("href")
            await randomSubMenuItem.click()
        } else {
            href = randomMenuItem.getAttribute("href")
            await randomMenuItem.click()
        }
        if (href === null) {
            throw new Error(`The href ${href} is null`);
        }
        return href;
    }

    async verifyFooterComp(slug: string) {
        let className: string = await this.getClassNameBySlug(slug)
        let pageObject = await this.createPageInstance(className)
        let footerComp: FooterComponent = pageObject.footerComp()

        // let homePage: HomePage = new HomePage(this.page)
        // let footerComp: FooterComponent = homePage.footerComp();

        await this.verifyInformationColumn(footerComp.informationColumnComp())
        await this.verifyCustomerServiceColumn(footerComp.customerServiceColumnComp())
        await this.verifyMyAccountColumn(footerComp.myAccountColumnComp())
        await this.verifyFollowUsColumn(footerComp.followUsColumnComp())
    }

    private async verifyInformationColumn(footerColumnComponent: FooterColumnComponent): Promise<void> {
        let expectedLinksText: string[] = ['Sitemap', 'Shipping & Returns', 'Privacy Notice', 'Conditions of Use', 'About us', 'Contact us']
        let expectedHrefs: string[] = ['/sitemap', '/shipping-returns', '/privacy-policy', '/conditions-of-use', '/about-us', '/contactus']
        this.verifyFooterColumn(footerColumnComponent, expectedLinksText, expectedHrefs)
    }

    private async verifyCustomerServiceColumn(footerColumnComponent: FooterColumnComponent) {
        let expectedLinksText: string[] = ['Search', 'News', 'Blog', 'Recently viewed products', 'Compare products list', 'New products']
        let expectedHrefs: string[] = ['/search', '/news', '/blog', '/recentlyviewedproducts', '/compareproducts', '/newproducts']
        this.verifyFooterColumn(footerColumnComponent, expectedLinksText, expectedHrefs)
    }

    private async verifyMyAccountColumn(footerColumnComponent: FooterColumnComponent) {
        let expectedLinksText: string[] = ['My account', 'Orders', 'Addresses', 'Shopping cart', 'Wishlist']
        let expectedHrefs: string[] = ['/customer/info', '/customer/orders', '/customer/addresses', '/cart', '/wishlist']
        this.verifyFooterColumn(footerColumnComponent, expectedLinksText, expectedHrefs)
    }

    private async verifyFollowUsColumn(footerColumnComponent: FooterColumnComponent) {
        let expectedLinksText: string[] = ['Facebook', 'Twitter', 'RSS', 'YouTube', 'Google+']
        let expectedHrefs: string[] = ['http://www.facebook.com/nopCommerce', 'https://twitter.com/nopCommerce', '/news/rss/1', 'http://www.youtube.com/user/nopCommerce', 'https://plus.google.com/+nopcommerce']
        this.verifyFooterColumn(footerColumnComponent, expectedLinksText, expectedHrefs)
    }

    private async verifyFooterColumn(
        footerColumnComp: FooterColumnComponent,
        expectedLinksText: string[],
        expectedHrefs: string[]
    ) {
        let actualLinksText: string[] = []
        let actualHrefs: string[] = []
        let footerColumnLinks: Locator[] = await footerColumnComp.links()

        for (const colunmnLink of footerColumnLinks) {
            let linkText = await colunmnLink.textContent()
            let href = await colunmnLink.getAttribute("href")
            if (linkText != null) {
                actualLinksText.push(linkText)
            }
            if (href != null) {
                actualHrefs.push(href)
            }
        }

        deepStrictEqual(actualLinksText, expectedLinksText,
            `Actual Link Text and Expected Link Text are not the same
            Actual: ${actualLinksText}
            Expected: ${expectedLinksText}
            `
        )

        deepStrictEqual(actualHrefs, expectedHrefs,
            `Actual Href and Expected Href are not the same
            Actual: ${actualHrefs}
            Expected: ${expectedHrefs}
            `
        )
    }
}