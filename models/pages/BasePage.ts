import { Locator, Page, TestInfo } from "@playwright/test";
import PageBodyComponent from "../components/PageBodyComponent.js";
import NotificationComponent from "../components/global/NotificationComponent.js";
import FooterComponent from "../components/global/footer/FooterComponent.js";
import HeaderComponent from "../components/global/header/HeaderComponent.js";
import TopMenuComponent from "../components/global/header/TopMenuComponent.js";

export default class BasePage {

    constructor(protected page: Page, protected testInfo: TestInfo) {
        this.page = page
        this.testInfo = testInfo
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
}