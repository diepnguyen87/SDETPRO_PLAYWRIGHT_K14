import { test as base, expect } from '@playwright/test';
import fs from 'fs';
export const test = base;
export { expect };

test.afterEach(async ({ page }, testInfo) => {
    // screenshot khi fail
    // attach vào Allure
    // log
    // cleanup
});