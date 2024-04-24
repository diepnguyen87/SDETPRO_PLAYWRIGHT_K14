import { Page } from "@playwright/test";
import PageBodyComponent from "../components/PageBodyComponent";
import FooterComponent from "../components/global/footer/FooterComponent";
import HeaderComponent from "../components/global/header/HeaderComponent";

export default class HomePage {

    constructor(private page: Page) {
        this.page = page
    }

    headerComp(): HeaderComponent {
        return new HeaderComponent(this.page.locator(HeaderComponent.selector));
    }

    pageBodyComp(): PageBodyComponent {
        return new PageBodyComponent(this.page.locator(PageBodyComponent.selector));
    }

    footerComp(): FooterComponent {
        return new FooterComponent(this.page.locator(FooterComponent.selector))
    }
}