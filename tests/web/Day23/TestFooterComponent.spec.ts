import { test } from '@playwright/test'
import HomePage from '../../../models/pages/HomePage.js';
import FooterComponent from '../../../models/components/global/footer/FooterComponent.js';
import InformationColumnComponent from '../../../models/components/global/footer/InformationColumnComponent.js';
import CustomerServiceColumnComponent from '../../../models/components/global/footer/CustomerServiceColumnComponent.js';
import MyAccountColumnComponent from '../../../models/components/global/footer/MyAccountColumnComponent.js';
import FollowUsColumnComponent from '../../../models/components/global/footer/FollowUsColumnComponent.js';

test('Advanced POM - Test Base Component', async ({ page }, testInfo) => {
    await page.goto("https://demowebshop.tricentis.com/")
    let homePage: HomePage = new HomePage(page, testInfo);
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