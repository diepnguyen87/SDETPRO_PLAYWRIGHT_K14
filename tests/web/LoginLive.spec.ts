import { test } from "@playwright/test";
import LoginFlow from "../../test-flows/LoginFlow.js";
import loginData from "../../test-data/login_live/LoginData.json" assert { type: "json" };

test(`Login Successfully`, async ({ page }, testInfo) => {
    await page.goto("/login")
    const loginFlow: LoginFlow = new LoginFlow(page, testInfo);
    loginFlow.enterEmail(loginData.email)
    loginFlow.enterPassword(loginData.password);
    loginFlow.clickLoginButton();
    loginFlow.verifyLogin();
    await page.waitForTimeout(10 * 1000)
});
