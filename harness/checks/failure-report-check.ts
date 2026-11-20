// Validates a /debug-failure JSON report (headless mode, written for agent:execute).
//   yarn harness:check-failure-report harness-results/failures/<run>/<file>.json [--json]
import fs from "node:fs";
import path from "node:path";
import { Issue, PROJECT_ROOT, isMainModule, relative, runCli } from "./markdown.js";
import { SECRET_PATTERNS } from "./requirement-check.js";

export const FAILURES_DIR = path.join("harness-results", "failures");
export const CATEGORIES = ["locator", "data", "component", "app", "environment", "config"] as const;
export const HEALING_OUTCOMES = ["HEALED", "MANUAL", "FAILED", "DISABLED", "SKIPPED", "NONE"] as const;
const LAST_STEP = 6;

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const nonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

export function checkFailureReport(filePath: string): Issue[] {
    const file = relative(filePath);
    const issues: Issue[] = [];
    const add = (message: string) => issues.push({ file, message });

    if (!file.startsWith(FAILURES_DIR + path.sep)) add(`Report must be under ${FAILURES_DIR}/`);

    const text = fs.readFileSync(filePath, "utf8");
    let report: unknown;
    try {
        report = JSON.parse(text);
    } catch (error) {
        add(`Not valid JSON: ${(error as Error).message}`);
        return issues;
    }
    if (!isObject(report)) {
        add("Report must be a JSON object");
        return issues;
    }

    // Project-relative path that must exist
    const existing = (value: unknown, field: string) => {
        if (!nonEmptyString(value)) return add(`${field} must be a non-empty path`);
        if (path.isAbsolute(value) || value.startsWith("..")) return add(`${field} must be project-relative: ${value}`);
        if (!fs.existsSync(path.join(PROJECT_ROOT, value))) add(`${field} does not exist: ${value}`);
    };

    const test = report.test;
    if (!isObject(test)) add("Missing test");
    else {
        if (!nonEmptyString(test.title)) add("test.title is required");
        if (!nonEmptyString(test.project)) add("test.project is required");
        existing(test.file, "test.file");
    }

    if (!nonEmptyString(report.error)) add("error is required");
    if (!(CATEGORIES as readonly unknown[]).includes(report.category)) add(`category must be one of ${CATEGORIES.join(" | ")}`);
    if (!nonEmptyString(report.rootCause)) add("rootCause is required");

    if (!Array.isArray(report.evidence) || report.evidence.length === 0) add("evidence needs at least one entry");
    else report.evidence.forEach((entry, index) => {
        if (!isObject(entry)) return add(`evidence[${index}] must be an object`);
        existing(entry.file, `evidence[${index}].file`);
        if (!nonEmptyString(entry.excerpt)) add(`evidence[${index}].excerpt is required`);
    });

    const healing = report.healing;
    if (!isObject(healing)) add("Missing healing");
    else {
        if (!(HEALING_OUTCOMES as readonly unknown[]).includes(healing.outcome)) add(`healing.outcome must be one of ${HEALING_OUTCOMES.join(" | ")}`);
        if (healing.aiResponse !== undefined) existing(healing.aiResponse, "healing.aiResponse");
        if (healing.patch !== undefined) {
            if (!isObject(healing.patch)) add("healing.patch must be an object");
            else existing(healing.patch.file, "healing.patch.file");
        }
    }

    if (report.rerun !== undefined) {
        if (!isObject(report.rerun)) add("rerun must be an object");
        else existing(report.rerun.result, "rerun.result");
    }

    const fix = report.proposedFix;
    if (!isObject(fix) || !nonEmptyString(fix.summary)) add("proposedFix.summary is required");
    else if (fix.files !== undefined) {
        if (!Array.isArray(fix.files) || fix.files.some(entry => !nonEmptyString(entry) || path.isAbsolute(entry) || entry.startsWith(".."))) {
            add("proposedFix.files must be project-relative paths");
        }
    }

    if (!Number.isInteger(report.confidence) || (report.confidence as number) < 0 || (report.confidence as number) > 100) add("confidence must be an integer 0–100");

    const steps = report.stepsVisited;
    if (!Array.isArray(steps) || steps.length === 0) add("stepsVisited needs at least one step");
    else if (steps.some((step, index) => !Number.isInteger(step) || step < 0 || step > LAST_STEP || (index > 0 && step <= steps[index - 1]))) {
        add(`stepsVisited must be ascending integers 0–${LAST_STEP}`);
    }

    for (const [pattern, label] of SECRET_PATTERNS) {
        if (pattern.test(text)) add(`Must not contain ${label}`);
    }

    return issues;
}

if (isMainModule(import.meta.url)) {
    runCli("harness:check-failure-report", checkFailureReport);
}
