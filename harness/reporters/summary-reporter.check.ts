// Checks the summary reporter with fake TestCase / TestResult objects (no browser). Run by yarn harness:test.
import type { FullResult, TestCase, TestResult, TestStep } from "@playwright/test/reporter";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import SummaryReporter, { changedDuringRun, failedStep, healingOutcome, specFile } from "./summary-reporter.js";

const OUTPUT_FILE = path.join(process.cwd(), "harness-results", "summary.json");
const TEST_DIR = path.join(process.cwd(), "tests", "web");
let failures = 0;

function check(name: string, actual: unknown, expected: unknown): void {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (!ok) failures++;
    console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ` — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
}

const project = { name: "Desktop Chromium" };
const fileSuite = { type: "file", title: "Day25/TestStandardComponent.spec.ts", project: () => project, parent: { type: "project", project: () => project } };

function fakeTest(annotations: Array<{ type: string }> = []): TestCase {
    return {
        title: "@Smoke | Test Credit Card Checkout",
        annotations,
        location: { file: path.join(process.cwd(), "tests", "fixtures", "base.ts"), line: 113, column: 12 },
        parent: fileSuite,
        outcome: () => "unexpected",
    } as unknown as TestCase;
}

function fakeResult(overrides: Partial<TestResult> = {}): TestResult {
    return { status: "failed", duration: 10, retry: 0, attachments: [], stdout: [], stderr: [], steps: [], annotations: [], ...overrides } as unknown as TestResult;
}

function aiResponse(patchType: string): string {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "summary-check-")), "ai-response.json");
    fs.writeFileSync(file, JSON.stringify({ patchType }));
    return file;
}

// Healing outcome
check("HEALED from the self-healed annotation", healingOutcome(fakeTest([{ type: "self-healed" }]), fakeResult({ status: "passed" })).outcome, "HEALED");
check("MANUAL from the AI Analysis attachment", healingOutcome(fakeTest(), fakeResult({ attachments: [{ name: "AI Analysis — ACTION (attempt 1)", path: aiResponse("MANUAL"), contentType: "application/json" }] })).outcome, "MANUAL");
check("FAILED from a LOCATOR analysis on a failed test", healingOutcome(fakeTest(), fakeResult({ attachments: [{ name: "AI Analysis — ACTION (attempt 1)", path: aiResponse("LOCATOR"), contentType: "application/json" }] })).outcome, "FAILED");
check("DISABLED from HealingEngine stdout", healingOutcome(fakeTest(), fakeResult({ stdout: ["[HealingEngine] Skipping — self-healing disabled for this run.\n"] })).outcome, "DISABLED");
check("FAILED when the AI analysis failed (console.error → stderr)", healingOutcome(fakeTest(), fakeResult({ stderr: ["[HealingEngine] AI analysis failed on attempt 1: 429\n"] })).outcome, "FAILED");
check("NONE without healing evidence", healingOutcome(fakeTest(), fakeResult()).outcome, "NONE");

// Failed step: deepest step with an error
const step = (title: string, error: boolean, steps: TestStep[] = []) => ({ title, category: "pw:api", error: error ? { message: "x" } : undefined, steps }) as unknown as TestStep;
check("failed step is the deepest erroring step", failedStep([step("ok", false), step("test.step outer", true, [step("locator.waitFor", true)])])?.title, "locator.waitFor");
check("no failed step when nothing errored", failedStep([step("ok", false)]), undefined);

// Spec file from the file suite, not base.ts
check("spec file from the file suite", specFile(fakeTest(), TEST_DIR), "tests/web/Day25/TestStandardComponent.spec.ts");

// Source changes
check("changed during run", changedDuringRun(new Map([["a.ts", "1"], ["b.ts", "1"]]), new Map([["a.ts", "1"], ["b.ts", "2"], ["c.ts.bak", "3"]])), ["b.ts", "c.ts.bak"]);

// Writing: nothing for a healing rerun child or a run without tests; a summary otherwise (the real file is restored)
async function checkWriting(): Promise<void> {
    const backup = fs.existsSync(OUTPUT_FILE) ? fs.readFileSync(OUTPUT_FILE) : null;
    const config = { projects: [{ testDir: TEST_DIR, use: {} }] } as never;
    const done = { status: "passed" } as FullResult;
    try {
        fs.rmSync(OUTPUT_FILE, { force: true });

        process.env.HEALING_RERUN = "true";
        const child = new SummaryReporter();
        child.onBegin(config);
        child.onTestBegin();
        child.onTestEnd(fakeTest(), fakeResult());
        await child.onEnd(done);
        check("healing rerun child writes nothing", fs.existsSync(OUTPUT_FILE), false);
        delete process.env.HEALING_RERUN;

        const list = new SummaryReporter();
        list.onBegin(config);
        await list.onEnd(done);
        check("--list run writes nothing", fs.existsSync(OUTPUT_FILE), false);

        const run = new SummaryReporter();
        run.onBegin(config);
        run.onTestBegin();
        run.onTestEnd(fakeTest(), fakeResult({ error: { message: "\u001b[31mboom\u001b[39m" } }));
        await run.onEnd({ status: "failed" } as FullResult);
        const written = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
        check("summary written with one test", written.tests.length, 1);
        check("test fields", [written.tests[0].file, written.tests[0].project, written.tests[0].error, written.tests[0].log], ["tests/web/Day25/TestStandardComponent.spec.ts", "Desktop Chromium", "boom", "logs/Desktop Chromium.Test_Credit_Card_Checkout.log"]);
        check("run totals", written.run.totals, { passed: 0, failed: 1, flaky: 0, skipped: 0, healed: 0 });
    } finally {
        delete process.env.HEALING_RERUN;
        if (backup) fs.writeFileSync(OUTPUT_FILE, backup);
        else fs.rmSync(OUTPUT_FILE, { force: true });
    }
}

checkWriting().then(() => {
    console.log(failures === 0 ? "All summary reporter checks passed" : `${failures} summary reporter check(s) failed`);
    process.exit(failures === 0 ? 0 : 1);
});
