// Writes harness-results/summary.json after a web test run: per test status, failed step, self-healing outcome and
// evidence paths, plus the source files the run changed (healing patches). Read by /debug-failure and agent:execute.
// Registered in playwright.config.web.js. It never fails the run.
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestError, TestResult, TestStep } from "@playwright/test/reporter";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import LoggerManager from "../../utils/LoggerManager.js";
import { testEnv } from "../../config/environment.config.js";

const PROJECT_ROOT = process.cwd();
const OUTPUT_FILE = path.join(PROJECT_ROOT, "harness-results", "summary.json");
const ARTIFACT_FOLDER = "artifacts";
const AI_ANALYSIS_ATTACHMENT = /^AI Analysis/;
const ANSI = /\u001b\[[0-9;]*m/g;

export type HealingOutcome = "HEALED" | "MANUAL" | "FAILED" | "DISABLED" | "SKIPPED" | "NONE";

export type TestSummary = {
    title: string;
    file: string;
    project: string;
    status: TestResult["status"];
    outcome: ReturnType<TestCase["outcome"]>;
    durationMs: number;
    retry: number;
    error?: string;
    failedStep?: { title: string; category: string; location?: string };
    healing: { outcome: HealingOutcome; reason?: string; aiResponse?: string };
    artifacts?: string;
    log: string;
    trace?: string;
    video?: string;
    screenshot?: string;
};

export type RunSummary = {
    run: {
        startedAt: string;
        finishedAt: string;
        status: FullResult["status"];
        env: string;
        baseURL?: string;
        gitSha?: string;
        dirtyAtStart: string[];
        command: string;
        errors: string[];
        totals: { passed: number; failed: number; flaky: number; skipped: number; healed: number };
    };
    tests: TestSummary[];
    sourceChanges: string[];
};

const relative = (file: string) => path.relative(PROJECT_ROOT, file);

function stripAnsi(text: string): string {
    return text.replace(ANSI, "");
}

function firstLines(text: string | undefined, count = 5): string | undefined {
    return text ? stripAnsi(text).split("\n").slice(0, count).join("\n").trim() : undefined;
}

// HealingEngine logs with console.log and console.error, so both streams are read
function consoleText(result: TestResult): string {
    return [...result.stdout, ...result.stderr].map(chunk => chunk.toString()).join("");
}

// Order: annotation from tests/fixtures/base.ts, then the AI Analysis attachment from HealingEngine, then its console output
export function healingOutcome(test: TestCase, result: TestResult): TestSummary["healing"] {
    if (test.annotations.some(annotation => annotation.type === "self-healed") || result.annotations?.some(annotation => annotation.type === "self-healed")) {
        return { outcome: "HEALED", reason: "self-healed annotation" };
    }

    const analysis = [...result.attachments].reverse().find(attachment => AI_ANALYSIS_ATTACHMENT.test(attachment.name) && attachment.path);
    if (analysis?.path) {
        const aiResponse = relative(analysis.path);
        let patchType: string | undefined;
        try {
            patchType = JSON.parse(fs.readFileSync(analysis.path, "utf8")).patchType;
        } catch {
            patchType = undefined;
        }
        if (patchType === "MANUAL") return { outcome: "MANUAL", reason: `${analysis.name}: patchType MANUAL`, aiResponse };
        if (result.status !== "passed") return { outcome: "FAILED", reason: `${analysis.name}: patchType ${patchType ?? "unknown"}, test ${result.status}`, aiResponse };
    }

    const output = consoleText(result);
    if (/\[HealingEngine\] Skipping — self-healing disabled/.test(output)) return { outcome: "DISABLED", reason: "self-healing disabled for this run" };
    if (/\[HealingEngine\] Source file locked by another worker/.test(output)) return { outcome: "SKIPPED", reason: "source file locked by another worker" };
    if (/\[HealingEngine\] AI analysis failed/.test(output)) return { outcome: "FAILED", reason: "AI analysis failed" };
    return { outcome: "NONE" };
}

// Deepest step with an error, depth-first
export function failedStep(steps: TestStep[]): TestSummary["failedStep"] {
    for (const step of steps) {
        const inner = failedStep(step.steps);
        if (inner) return inner;
        if (step.error) {
            const location = step.location ? `${relative(step.location.file)}:${step.location.line}` : undefined;
            return { title: step.title, category: step.category, ...(location ? { location } : {}) };
        }
    }
    return undefined;
}

// Tests registered through tests/fixtures/base.ts report base.ts as their location; the file suite holds the spec
export function specFile(test: TestCase, testDir: string): string {
    for (let suite: Suite | undefined = test.parent; suite; suite = suite.parent) {
        if (suite.type === "file") return relative(path.join(testDir, suite.title));
    }
    return relative(test.location.file);
}

function attachmentPath(result: TestResult, name: string): string | undefined {
    const attachment = result.attachments.find(candidate => candidate.name === name && candidate.path);
    return attachment?.path ? relative(attachment.path) : undefined;
}

export function testSummary(test: TestCase, result: TestResult, testDir: string): TestSummary {
    const project = test.parent.project()?.name ?? "";
    const artifacts = path.join(ARTIFACT_FOLDER, project, test.title.replace(/\W+/g, "_"));
    const step = failedStep(result.steps);
    const optional = {
        error: firstLines(result.error?.message),
        failedStep: step,
        artifacts: fs.existsSync(path.join(PROJECT_ROOT, artifacts)) ? artifacts : undefined,
        trace: attachmentPath(result, "trace"),
        video: attachmentPath(result, "video"),
        screenshot: attachmentPath(result, "screenshot"),
    };
    return {
        title: test.title,
        file: specFile(test, testDir),
        project,
        status: result.status,
        outcome: test.outcome(),
        durationMs: result.duration,
        retry: result.retry,
        ...Object.fromEntries(Object.entries(optional).filter(([, value]) => value !== undefined)),
        healing: healingOutcome(test, result),
        log: LoggerManager.logFilePath(project, test.title),
    } as TestSummary;
}

function git(args: string[]): string {
    try {
        return execFileSync("git", args, { cwd: PROJECT_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch {
        return "";
    }
}

// Content hash of every dirty or untracked file, so a change to an already-dirty file is still detected
function dirtyHashes(): Map<string, string> {
    const hashes = new Map<string, string>();
    for (const entry of git(["status", "--porcelain=v1", "--untracked-files=all", "-z"]).split("\0").filter(Boolean)) {
        const file = entry.slice(3);
        const absolute = path.join(PROJECT_ROOT, file);
        hashes.set(file, fs.existsSync(absolute) && fs.statSync(absolute).isFile() ? createHash("sha1").update(fs.readFileSync(absolute)).digest("hex") : "deleted");
    }
    return hashes;
}

export function changedDuringRun(before: Map<string, string>, after: Map<string, string>): string[] {
    const changed = new Set<string>();
    for (const [file, hash] of after) if (before.get(file) !== hash) changed.add(file);
    for (const file of before.keys()) if (!after.has(file)) changed.add(file);
    return [...changed].sort();
}

export default class SummaryReporter implements Reporter {
    private config?: FullConfig;
    private startedAt = new Date();
    private testsBegan = false;
    private dirtyAtStart = new Map<string, string>();
    private gitSha = "";
    private readonly results = new Map<TestCase, TestResult>();
    private readonly errors: string[] = [];

    printsToStdio(): boolean {
        return false;
    }

    onBegin(config: FullConfig): void {
        this.config = config;
        this.startedAt = new Date();
        if (!this.enabled()) return;
        this.gitSha = git(["rev-parse", "HEAD"]).trim();
        this.dirtyAtStart = dirtyHashes();
    }

    onTestBegin(): void {
        this.testsBegan = true;
    }

    onTestEnd(test: TestCase, result: TestResult): void {
        this.results.set(test, result);
    }

    onError(error: TestError): void {
        this.errors.push(stripAnsi(error.message ?? String(error.value ?? "")));
    }

    async onEnd(result: FullResult): Promise<void> {
        // A healing rerun child would overwrite the parent's summary; --list runs no test
        if (!this.enabled() || (!this.testsBegan && this.errors.length === 0)) return;
        try {
            const summary = this.build(result);
            await fs.promises.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
            await fs.promises.writeFile(OUTPUT_FILE, JSON.stringify(summary, null, 2) + "\n");
        } catch (error) {
            console.warn(`[SummaryReporter] Could not write ${relative(OUTPUT_FILE)}: ${(error as Error).message}`);
        }
    }

    private enabled(): boolean {
        return process.env.HEALING_RERUN !== "true";
    }

    private build(result: FullResult): RunSummary {
        const testDir = this.config?.projects[0]?.testDir ?? path.join(PROJECT_ROOT, "tests", "web");
        const tests = [...this.results].map(([test, testResult]) => testSummary(test, testResult, testDir));
        const use = this.config?.projects[0]?.use as { baseURL?: string } | undefined;
        return {
            run: {
                startedAt: this.startedAt.toISOString(),
                finishedAt: new Date().toISOString(),
                status: result.status,
                env: testEnv,
                ...(use?.baseURL ? { baseURL: use.baseURL } : {}),
                ...(this.gitSha ? { gitSha: this.gitSha } : {}),
                dirtyAtStart: [...this.dirtyAtStart.keys()].sort(),
                command: process.argv.slice(2).join(" "),
                errors: this.errors,
                totals: {
                    passed: tests.filter(test => test.outcome === "expected").length,
                    failed: tests.filter(test => test.outcome === "unexpected").length,
                    flaky: tests.filter(test => test.outcome === "flaky").length,
                    skipped: tests.filter(test => test.outcome === "skipped").length,
                    healed: tests.filter(test => test.healing.outcome === "HEALED").length,
                },
            },
            tests,
            sourceChanges: changedDuringRun(this.dirtyAtStart, dirtyHashes()),
        };
    }
}
