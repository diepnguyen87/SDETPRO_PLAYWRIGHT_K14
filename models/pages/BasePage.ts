import { Page } from "@playwright/test";
import PageBodyComponent from "../components/PageBodyComponent.js";
import NotificationComponent from "../components/global/NotificationComponent.js";
import FooterComponent from "../components/global/footer/FooterComponent.js";
import HeaderComponent from "../components/global/header/HeaderComponent.js";
import TopMenuComponent from "../components/global/header/TopMenuComponent.js";

export default class BasePage {

    constructor(protected page: Page) {
        this.page = page
    }

    notificationComp(): NotificationComponent {
        return new NotificationComponent(this.page.locator(NotificationComponent.selectorValue))
    }

    headerComp(): HeaderComponent {
        return new HeaderComponent(this.page.locator(HeaderComponent.selectorValue));
    }

    topMenuComp(): TopMenuComponent {
        return new TopMenuComponent(this.page.locator(TopMenuComponent.selector))
    }

    pageBodyComp(): PageBodyComponent {
        return new PageBodyComponent(this.page.locator(PageBodyComponent.selector));
    }

    footerComp(): FooterComponent {
        return new FooterComponent(this.page.locator(FooterComponent.selector))
    }
}