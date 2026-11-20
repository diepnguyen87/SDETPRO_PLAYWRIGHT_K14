// Checks failure-report-check with a valid report and one variant per broken rule. Run by yarn harness:test.
import fs from "node:fs";
import path from "node:path";
import { checkFailureReport, FAILURES_DIR } from "./failure-report-check.js";
import { PROJECT_ROOT } from "./markdown.js";

const CHECK_DIR = path.join(PROJECT_ROOT, FAILURES_DIR, "_check");
const OUTSIDE_FILE = path.join(PROJECT_ROOT, "harness-results", "_failure-report-check.json");
let failures = 0;

const valid = {
    test: { title: "@Smoke | Test Credit Card Checkout", file: "tests/web/Day25/TestStandardComponent.spec.ts", project: "Desktop Chromium" },
    error: "locator.waitFor: Timeout 5000ms exceeded.",
    failedStep: { title: "locator.waitFor", location: "models/components/global/NotificationComponent.ts:21" },
    category: "locator",
    rootCause: "The notification close button selector no longer matches.",
    evidence: [{ file: "models/components/global/NotificationComponent.ts", excerpt: "private closeBtnSel = ..." }],
    healing: { outcome: "MANUAL", reason: "patchType MANUAL" },
    proposedFix: { summary: "Update the selector.", files: ["models/components/global/NotificationComponent.ts"], needsRequirement: true },
    confidence: 80,
    stepsVisited: [0, 1, 4],
};

function run(name: string, report: unknown, expected: RegExp | null, file = path.join(CHECK_DIR, `${name.replace(/\W+/g, "_")}.json`)): void {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, typeof report === "string" ? report : JSON.stringify(report));
    const messages = checkFailureReport(file).map(issue => issue.message);
    const ok = expected === null ? messages.length === 0 : messages.some(message => expected.test(message));
    if (!ok) failures++;
    console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ` — got ${JSON.stringify(messages)}`}`);
}

const without = (key: string) => Object.fromEntries(Object.entries(valid).filter(([field]) => field !== key));

try {
    run("valid report", valid, null);
    run("not JSON", "{ nope", /Not valid JSON/);
    run("missing rootCause", without("rootCause"), /rootCause is required/);
    run("bad category", { ...valid, category: "flaky" }, /category must be one of/);
    run("bad healing outcome", { ...valid, healing: { outcome: "PATCHED" } }, /healing.outcome must be one of/);
    run("confidence out of range", { ...valid, confidence: 120 }, /confidence must be an integer/);
    run("no evidence", { ...valid, evidence: [] }, /evidence needs at least one entry/);
    run("missing evidence file", { ...valid, evidence: [{ file: "models/Nope.ts", excerpt: "x" }] }, /evidence\[0\].file does not exist/);
    run("absolute fix path", { ...valid, proposedFix: { summary: "x", files: ["/etc/passwd"] } }, /proposedFix.files must be project-relative/);
    run("steps not ascending", { ...valid, stepsVisited: [2, 1] }, /stepsVisited must be ascending/);
    run("email in an excerpt", { ...valid, evidence: [{ ...valid.evidence[0], excerpt: "user someone@example.com" }] }, /Must not contain an email address/);
    run("report outside failures/", valid, /Report must be under/, OUTSIDE_FILE);
} finally {
    fs.rmSync(CHECK_DIR, { recursive: true, force: true });
    fs.rmSync(OUTSIDE_FILE, { force: true });
}

console.log(failures === 0 ? "All failure report checks passed" : `${failures} failure report check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
