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
                testInfo.annotations.push({ type: 'self-healed', description: 'Action healed; remaining steps skipped' });
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
                    const failureContext = await AssertionFailureCollector.collect(error, page, testInfo);
                    result = await HealingEngine.handle(failureContext, testInfo);
                } catch (engineError) {
                    console.error("[base.ts] Assertion healing engine failed unexpectedly:", engineError);
                }

                if (result?.status === "HEALED") {
                    testInfo.annotations.push({ type: 'self-healed', description: 'Assertion healed; remaining steps skipped' });
                    return;
                }
            }

            // Original error always preserved and re-thrown
            throw error;
        }
    };
}

type Register = (...args: any[]) => void;

// Supports test(title, fn) and test(title, details, fn)
const wrap = (register: Register) => (title: string, ...args: any[]) => {
    const fn = args.pop() as TestBody;
    return register(title, ...args, withSelfHealingGuard(fn));
};

export const test = Object.assign(wrap(base), base, {
    only: wrap(base.only),
}) as typeof base;
export { expect };

// const testWrapper = (title: string, fn: TestBody): void =>
//     (base as any)(title, withSelfHealingGuard(fn));

// // export const test = Object.assign(testWrapper, base) as typeof base;
// export { expect };
