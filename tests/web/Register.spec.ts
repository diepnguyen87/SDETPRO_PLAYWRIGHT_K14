import "dotenv/config";
import { test } from "@playwright/test";
import RegisterTestFlow from "../../test-flows/RegisterTestFlow.js";
import registerData from "../../test-data/RegisterData.json" assert { type: "json" };
import { TAG } from "../../constant/Tag.js";

test(`${TAG.smoke} | Register with valid credentials`, async ({ page }, testInfo) => {
    const gender = process.env.REGISTER_GENDER ?? 'male';
    const firstName = process.env.REGISTER_FIRST_NAME ?? '';
    const lastName = process.env.REGISTER_LAST_NAME ?? '';
    const baseEmail = process.env.REGISTER_EMAIL ?? '';
    const [localPart, domain] = baseEmail.split('@');
    const email = `${localPart}${Date.now()}@${domain}`;
    const password = process.env.REGISTER_PASSWORD ?? '';
    const confirmPassword = process.env.REGISTER_CONFIRM_PASSWORD ?? '';
    await page.goto('/register');
    const registerTestFlow = new RegisterTestFlow(page, testInfo);
    await registerTestFlow.register({ gender, firstName, lastName, email, password, confirmPassword });
    await registerTestFlow.verifyRegisterSuccess();
});

test(`${TAG.regression} | Register with missing first name`, async ({ page }, testInfo) => {
    await page.goto('/register');
    const registerTestFlow = new RegisterTestFlow(page, testInfo);
    await registerTestFlow.register(registerData.missingFirstName);
    await registerTestFlow.verifyMissingFirstNameValidationError();
});

test(`${TAG.regression} | Register with missing last name`, async ({ page }, testInfo) => {
    await page.goto('/register');
    const registerTestFlow = new RegisterTestFlow(page, testInfo);
    await registerTestFlow.register(registerData.missingLastName);
    await registerTestFlow.verifyMissingLastNameValidationError();
});

test(`${TAG.regression} | Register with missing email`, async ({ page }, testInfo) => {
    await page.goto('/register');
    const registerTestFlow = new RegisterTestFlow(page, testInfo);
    await registerTestFlow.register(registerData.missingEmail);
    await registerTestFlow.verifyMissingEmailValidationError();
});

test(`${TAG.regression} | Register with missing password`, async ({ page }, testInfo) => {
    await page.goto('/register');
    const registerTestFlow = new RegisterTestFlow(page, testInfo);
    await registerTestFlow.register(registerData.missingPassword);
    await registerTestFlow.verifyMissingPasswordValidationError();
});

test(`${TAG.regression} | Register with missing confirm password`, async ({ page }, testInfo) => {
    await page.goto('/register');
    const registerTestFlow = new RegisterTestFlow(page, testInfo);
    await registerTestFlow.register(registerData.missingConfirmPassword);
    await registerTestFlow.verifyMissingConfirmPasswordValidationError();
});

test(`${TAG.regression} | Register with invalid email format`, async ({ page }, testInfo) => {
    await page.goto('/register');
    const registerTestFlow = new RegisterTestFlow(page, testInfo);
    await registerTestFlow.register(registerData.invalidEmailFormat);
    await registerTestFlow.verifyInvalidEmailFormatValidationError();
});

test(`${TAG.regression} | Register with confirm password mismatch`, async ({ page }, testInfo) => {
    await page.goto('/register');
    const registerTestFlow = new RegisterTestFlow(page, testInfo);
    await registerTestFlow.register(registerData.confirmPasswordMismatch);
    await registerTestFlow.verifyConfirmPasswordMismatchValidationError();
});

test(`${TAG.regression} | Register with password less than 6 characters`, async ({ page }, testInfo) => {
    await page.goto('/register');
    const registerTestFlow = new RegisterTestFlow(page, testInfo);
    await registerTestFlow.register(registerData.passwordTooShort);
    await registerTestFlow.verifyPasswordTooShortValidationError();
});

test(`${TAG.regression} | Register with existing email`, async ({ page }, testInfo) => {
    await page.goto('/register');
    const registerTestFlow = new RegisterTestFlow(page, testInfo);
    await registerTestFlow.register(registerData.existingEmail);
    await registerTestFlow.verifyExistingEmailSummaryError();
});
