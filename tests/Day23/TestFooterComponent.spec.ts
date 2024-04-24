import { test } from '@playwright/test'
import CustomerServiceColumnComponent from '../../models/components/global/footer/CustomerServiceColumnComponent'
import FollowUsColumnComponent from '../../models/components/global/footer/FollowUsColumnComponent'
import FooterComponent from '../../models/components/global/footer/FooterComponent'
import InformationColumnComponent from '../../models/components/global/footer/InformationColumnComponent'
import MyAccountColumnComponent from '../../models/components/global/footer/MyAccountColumnComponent'
import HomePage from '../../models/pages/HomePage'

test('Advanced POM - Test Base Component', async ({ page }) => {
    await page.goto("https://demowebshop.tricentis.com/")
    let homePage: HomePage = new HomePage(page);
    let footerComp: FooterComponent = homePage.footerComp();
    let informationComp: InformationColumnComponent = footerComp.informationColumnComp();
    let customerServiceComp: CustomerServiceColumnComponent = footerComp.customerServiceColumnComp();
    let myAccountComp: MyAccountColumnComponent = footerComp.myAccountColumnComp();
    let followUSComp: FollowUsColumnComponent = footerComp.followUsColumnComp();

    console.log(`Information column title: ${await informationComp.title().textContent()}`);
    console.log(`Customer column title: ${await customerServiceComp.title().textContent()}`);
    console.log(`My Account column title: ${await myAccountComp.title().textContent()}`);
    console.log(`Follow Us column title: ${await followUSComp.title().textContent()}`);
})