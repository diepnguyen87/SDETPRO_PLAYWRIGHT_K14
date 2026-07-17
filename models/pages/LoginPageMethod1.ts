//Introducing main interaction methods
import { Page } from "@playwright/test"

export default class LoginPageMethod1 {
    private userNameSel = "input[id='username']"
    private passwordSel = "input[id='password']"
    private loginBtnSel = "button[type='submit']"

    constructor(private page: Page) {
        this.page = page;
    }

    async inputUserName(userName: string){
        await this.page.locator(this.userNameSel).fill(userName);
    }

    async inputPassword(password: string){
        await this.page.locator(this.passwordSel).fill(password);
    }

    async clickOnLoginBtn(){
        await this.page.locator(this.loginBtnSel).click();
    }
}