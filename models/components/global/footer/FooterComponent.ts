import { Locator, Page, TestInfo } from "@playwright/test";
import CustomerServiceColumnComponent from "./CustomerServiceColumnComponent.js";
import FollowUsColumnComponent from "./FollowUsColumnComponent.js";
import InformationColumnComponent from "./InformationColumnComponent.js";
import MyAccountColumnComponent from "./MyAccountColumnComponent.js";
import { selector } from "../../SelectorDecorator.js";
import Component from "../../Component.js";

@selector(".footer")
export default class FooterComponent extends Component {

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async scrollToFooter() {
        await this.componentLocator.scrollIntoViewIfNeeded();
    }

    public informationColumnComp(): InformationColumnComponent {
        return new InformationColumnComponent(this.page, this.componentLocator.locator(InformationColumnComponent.selectorValue), this.testInfo)
    }

    public customerServiceColumnComp(): CustomerServiceColumnComponent {
        return new CustomerServiceColumnComponent(this.page, this.componentLocator.locator(CustomerServiceColumnComponent.selectorValue), this.testInfo)
    }

    public myAccountColumnComp(): MyAccountColumnComponent {
        return new MyAccountColumnComponent(this.page, this.componentLocator.locator(MyAccountColumnComponent.selectorValue), this.testInfo)
    }

    public followUsColumnComp(): FollowUsColumnComponent {
        return new FollowUsColumnComponent(this.page, this.componentLocator.locator(FollowUsColumnComponent.selectorValue), this.testInfo)
    }
}