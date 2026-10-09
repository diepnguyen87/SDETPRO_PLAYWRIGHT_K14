import { APIRequestContext, test as base, Browser, BrowserContext, expect, Page, TestInfo } from '@playwright/test';
import SelfHealingSuccess from '../../ai/SelfHealingSuccess.js';
import AssertionFailureCollector from '../../ai/collectors/AssertionFailureCollector.js';
import HealingEngine from '../../ai/HealingEngine.js';
import { HealingResult } from '../../models/ai/HealingResult.js';
import LoginTestFlow from '../../test-flows/LoginTestFlow.js';
import { frameworkConfig } from '../../config/framework.config.js';
import path from 'path';

export type Credential = { email: string; password: string };

type TestOptions = {
    loggedIn: boolean;
};

type WorkerFixtures = {
    credential: Credential | null;
};

// Logged-in storage state is created once per worker process and reused
let workerStatePath: string | undefined;

type TestFixtures = {
    page: Page;
    browser: Browser;
    context: BrowserContext;
    request: APIRequestContext;
    credential: Credential | null;
};

type TestBody = (
    fixtures: TestFixtures,
    testInfo: TestInfo
) => Promise<void>;

type Register = (...args: any[]) => void;

function withSelfHealingGuard(fn: TestBody): TestBody {
    return async ({ page, browser, context, request, credential }, testInfo) => {
        try {
            await fn({ page, browser, context, request, credential }, testInfo);
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

const baseTest = base.extend<TestOptions, WorkerFixtures>({
    credential: [async ({}, use, workerInfo) => {
        const idx = process.env.CREDENTIAL_INDEX !== undefined
                    ? Number(process.env.CREDENTIAL_INDEX)
                    : workerInfo.parallelIndex;

        const email    = process.env[`LOGIN_EMAIL_${idx}`]
        const password = process.env[`LOGIN_PASSWORD_${idx}`]

        await use(email && password ? { email, password } : null);
    }, { scope: 'worker' }],

    loggedIn: [false, { option: true }],

    storageState: async ({ storageState, loggedIn, credential, browser }, use, testInfo) => {
        if (!loggedIn || !credential) return use(storageState);

        if (!workerStatePath) {
            const statePath = path.join(frameworkConfig.authFolder, `credential-${testInfo.parallelIndex}.json`);
            const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
            const page = await context.newPage();
            await page.goto('/login');
            const loginFlow = new LoginTestFlow(page, testInfo);
            await loginFlow.login(credential.email, credential.password);
            await loginFlow.verifyLoginSuccess(credential.email);
            await context.storageState({ path: statePath });
            await context.close();
            workerStatePath = statePath;
        }
        await use(workerStatePath);
    },
});

// Supports test(title, fn) and test(title, details, fn)
const wrap = (register: Register) => (title: string, ...args: any[]) => {
    const fn = args.pop() as TestBody;
    return register(title, ...args, withSelfHealingGuard(fn));
};

export const test = Object.assign(wrap(baseTest), baseTest, {
    only: wrap(baseTest.only),
}) as typeof baseTest;
export { expect };
