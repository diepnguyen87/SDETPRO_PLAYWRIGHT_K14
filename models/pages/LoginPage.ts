import { Page } from "@playwright/test";
import BasePage from "./BasePage.js";

export default class LoginPage extends BasePage {
    constructor(page: Page){
        super(page)
    }
}