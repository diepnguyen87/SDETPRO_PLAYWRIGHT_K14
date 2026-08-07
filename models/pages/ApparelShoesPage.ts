import { Page, TestInfo } from "@playwright/test";
import BasePage from "./BasePage.js";

export default class ApparelShoesPage extends BasePage{
    constructor(page: Page, testInfo:TestInfo){
        super(page, testInfo)
    }
}