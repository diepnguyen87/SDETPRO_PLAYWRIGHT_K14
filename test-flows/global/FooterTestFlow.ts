import { Page } from "@playwright/test"
import HomePage from '../../models/pages/HomePage'
import InformationColumnComponent from "../../models/components/global/footer/InformationColumnComponent";
import CustomerServiceColumnComponent from "../../models/components/global/footer/CustomerServiceColumnComponent";
import MyAccountColumnComponent from "../../models/components/global/footer/MyAccountColumnComponent";
import FollowUsColumnComponent from "../../models/components/global/footer/FollowUsColumnComponent";

export default class FooterTestFlow {

    constructor(private page: Page) {
        this.page = page;
    }

    async verifyFooterComp() {
        await this.verifyInformationColumn()
        this.verifyCustomerServiceColumn()
        this.verifyMyAccountColumn()
        this.verifyFollowUsColumn()
    }

    private async verifyInformationColumn(): Promise<void> {
        let homePage: HomePage = new HomePage(this.page)
        let informationColumnComp: InformationColumnComponent = homePage.footerComp().informationColumnComp()
        console.log(`Title: ${await informationColumnComp.title().textContent()}`);
    }

    private async verifyCustomerServiceColumn() {
        let homePage: HomePage = new HomePage(this.page)
        let customerServiceColumnComp: CustomerServiceColumnComponent = homePage.footerComp().customerServiceColumnComp()
        console.log(`Title: ${await customerServiceColumnComp.title().textContent()}`);
    }

    private async verifyMyAccountColumn() {
        let homePage: HomePage = new HomePage(this.page)
        let myAccountColumnComp: MyAccountColumnComponent = homePage.footerComp().myAccountColumnComp()
        console.log(`Title: ${await myAccountColumnComp.title().textContent()}`);
    }


    private async verifyFollowUsColumn() {
        let homePage: HomePage = new HomePage(this.page)
        let followUsColumnComp: FollowUsColumnComponent = homePage.footerComp().followUsColumnComp()
        console.log(`Title: ${await followUsColumnComp.title().textContent()}`);
    }
}