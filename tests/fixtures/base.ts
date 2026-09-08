import { APIRequestContext, test as base, BrowserContext, expect, Page, TestInfo } from '@playwright/test';
import SelfHealingSuccess from '../../ai/SelfHealingSuccess.js';
import AssertionFailureCollector from '../../ai/collectors/AssertionFailureCollector.js';
import HealingEngine from '../../ai/HealingEngine.js';
import { HealingResult } from '../../models/ai/HealingResult.js';

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

            // Healing succeeded inside withHealing() — test exits cleanly
            if (error instanceof SelfHealingSuccess) {
                console.log(
                    "Self-healing succeeded. " +
                    "Original test execution stopped."
                );
                return;
            }

            // Only route expect() assertion failures — action errors are
            // already handled (and optionally healed) by withHealing()
            if (AssertionFailureCollector.isAssertionError(error)) {
                let result: HealingResult | null = null;
                try {
                    const context = await AssertionFailureCollector.collect(error, page, testInfo);
                    result = await HealingEngine.handle(context, testInfo);
                } catch (engineError) {
                    console.error("[base.ts] Assertion healing engine failed unexpectedly:", engineError);
                }

                if (result?.status === "HEALED") return;
            }

            // Original error always preserved and re-thrown
            throw error;
        }
    };
}

const testWrapper = (title: string, fn: TestBody): void =>
    (base as any)(title, withSelfHealingGuard(fn));

export const test = Object.assign(testWrapper, base) as typeof base;
export { expect };
