import { Locator } from "@playwright/test";
import CustomerServiceColumnComponent from "./CustomerServiceColumnComponent";
import FollowUsColumnComponent from "./FollowUsColumnComponent";
import InformationColumnComponent from "./InformationColumnComponent";
import MyAccountColumnComponent from "./MyAccountColumnComponent";

export default class FooterComponent {
    public static selector: string = ".footer"

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