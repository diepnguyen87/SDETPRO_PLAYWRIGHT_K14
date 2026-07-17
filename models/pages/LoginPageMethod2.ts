//Introducing Element/Locator
import { Locator, Page } from "@playwright/test"

export default class LoginPageMethod2 {
    private userNameSel = "input[id='username']"
    private passwordSel = "input[id='password']"
    private loginBtnSel = "button[type='submit']"

    constructor(private page: Page) {
        this.page = page;
    }

    userName() {
        return this.page.locator(this.userNameSel)
    }

    password(): Locator {
        return this.page.locator(this.passwordSel);
    }

    loginBtn(): Locator {
        return this.page.locator(this.loginBtnSel);
    }
}