import { Locator } from "@playwright/test";
import CustomerServiceColumnComponent from "./CustomerServiceColumnComponent.js";
import FollowUsColumnComponent from "./FollowUsColumnComponent.js";
import InformationColumnComponent from "./InformationColumnComponent.js";
import MyAccountColumnComponent from "./MyAccountColumnComponent.js";
import { selector } from "../../SelectorDecorator.js";

@selector(".footer")
export default class FooterComponent {

    constructor(private component: Locator) {
        this.component = component
    }

    public informationColumnComp(): InformationColumnComponent {
        return new InformationColumnComponent(this.component.locator(InformationColumnComponent.selector))
    }

    public customerServiceColumnComp(): CustomerServiceColumnComponent {
        return new CustomerServiceColumnComponent(this.component.locator(CustomerServiceColumnComponent.selector))
    }

    public myAccountColumnComp(): MyAccountColumnComponent {
        return new MyAccountColumnComponent(this.component.locator(MyAccountColumnComponent.selector))
    }

    public followUsColumnComp(): FollowUsColumnComponent {
        return new FollowUsColumnComponent(this.component.locator(FollowUsColumnComponent.selector))
    }
}