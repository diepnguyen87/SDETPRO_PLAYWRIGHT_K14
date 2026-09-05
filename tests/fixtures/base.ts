import { APIRequestContext, test as base, BrowserContext, expect, Page, TestInfo } from '@playwright/test';
import SelfHealingSuccess from '../../ai/SelfHealingSuccess.js';

type TestFixtures = {
    page: Page;
    context: BrowserContext;
    request: APIRequestContext;
};

type TestBody = (
    fixtures: TestFixtures,
    testInfo: TestInfo
) => Promise<void>;

function withSelfHealingGuard(fn: TestBody): TestBody {
    return async ({ page, context, request }, testInfo) => {
        try {
            await fn({ page, context, request }, testInfo);
        } catch (error) {
            if (error instanceof SelfHealingSuccess) {
                console.log(
                    "Self-healing succeeded. " +
                    "Original test execution stopped."
                );
                return;
            }
            throw error;
        }
    };
}

const testWrapper = (title: string, fn: TestBody): void =>
    (base as any)(title, withSelfHealingGuard(fn));

export const test = Object.assign(testWrapper, base) as typeof base;
export { expect };