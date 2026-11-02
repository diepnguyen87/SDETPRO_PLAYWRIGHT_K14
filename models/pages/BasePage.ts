import { Locator, Page, TestInfo } from "@playwright/test";
import Component from "../components/Component.js";
import PageBodyComponent from "../components/PageBodyComponent.js";
import NotificationComponent from "../components/global/NotificationComponent.js";
import FooterComponent from "../components/global/footer/FooterComponent.js";
import HeaderComponent from "../components/global/header/HeaderComponent.js";
import TopMenuComponent from "../components/global/header/TopMenuComponent.js";
import pages from "../../config/pages.json" with { type: "json" };

export default class BasePage extends Component {

    private static readonly rootSel = "body"

    constructor(page: Page, testInfo: TestInfo) {
        super(page, page.locator(BasePage.rootSel), testInfo)
    }

    notificationComp(): NotificationComponent {
        return new NotificationComponent(this.page, this.page.locator(NotificationComponent.selectorValue), this.testInfo)
    }

    headerComp(): HeaderComponent {
        return new HeaderComponent(this.page, this.page.locator(HeaderComponent.selectorValue), this.testInfo);
    }

    topMenuComp(): TopMenuComponent {
        return new TopMenuComponent(this.page, this.page.locator(TopMenuComponent.selectorValue), this.testInfo)
    }

    pageBodyComp(): PageBodyComponent {
        return new PageBodyComponent(this.page, this.page.locator(PageBodyComponent.selectorValue), this.testInfo);
    }

    footerComp(): FooterComponent {
        return new FooterComponent(this.page, this.page.locator(FooterComponent.selectorValue), this.testInfo)
    }

    // Waits until the URL matches this page's slug in config/pages.json (":param" matches one path segment)
    protected async ensureLoaded(): Promise<void> {
        const pageObj = pages.find(p => p.className === this.constructor.name)
        if (!pageObj) {
            throw new Error(`${this.constructor.name} is not registered in config/pages.json`)
        }
        const slugPattern = new RegExp(`^${pageObj.slug.replace(/:[^/]+/g, "[^/]+")}/?$`)
        await this.page.waitForURL(url => slugPattern.test(url.pathname))
    }
}