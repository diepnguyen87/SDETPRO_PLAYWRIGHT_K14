import "dotenv/config";
import { test } from "@playwright/test";
import LoginTestFlow from "../../test-flows/LoginTestFlow.js";
import loginData from "../../test-data/LoginData.json" assert { type: "json" };
import { TAG } from "../../constant/Tag.js";

test(`${TAG.smoke} | Login with valid credentials`, async ({ page }, testInfo) => {
    const email = process.env.LOGIN_EMAIL ?? '';
    const password = process.env.LOGIN_PASSWORD ?? '';
    await page.goto('/login');
    const loginTestFlow = new LoginTestFlow(page, testInfo);
    await loginTestFlow.login(email, password);
    await loginTestFlow.verifyLoginSuccess(email);
});

test(`${TAG.regression} | Login with invalid credentials`, async ({ page }, testInfo) => {
    await page.goto('/login');
    const loginTestFlow = new LoginTestFlow(page, testInfo);
    await loginTestFlow.login(loginData.invalidUser.email, loginData.invalidUser.password);
    await loginTestFlow.verifyLoginFailedWithSummaryError();
});

test(`${TAG.regression} | Login with empty email`, async ({ page }, testInfo) => {
    await page.goto('/login');
    const loginTestFlow = new LoginTestFlow(page, testInfo);
    await loginTestFlow.login(loginData.emptyEmail.email, loginData.emptyEmail.password);
    await loginTestFlow.verifyLoginFailedWithSummaryError();
});

test(`${TAG.regression} | Login with empty password`, async ({ page }, testInfo) => {
    await page.goto('/login');
    const loginTestFlow = new LoginTestFlow(page, testInfo);
    await loginTestFlow.login(loginData.emptyPassword.email, loginData.emptyPassword.password);
    await loginTestFlow.verifyLoginFailedWithSummaryError();
});

test(`${TAG.regression} | Login with invalid email format`, async ({ page }, testInfo) => {
    await page.goto('/login');
    const loginTestFlow = new LoginTestFlow(page, testInfo);
    await loginTestFlow.login(loginData.invalidEmailFormat.email, loginData.invalidEmailFormat.password);
    await loginTestFlow.verifyLoginFailedWithEmailValidationError();
});
