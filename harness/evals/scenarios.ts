// Agent eval scenarios for yarn harness:eval: each plants a known situation, runs one skill headless and checks the
// result deterministically (files, fields, existing checkers). The runner restores the tree after every scenario.
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "../checks/markdown.js";
import { TAG } from "../../constant/Tag.js";
import type { RunSummary } from "../reporters/summary-reporter.js";
import { StageFailure, dirtyFileHashes, runCommand, skillTools } from "../agent/runner.js";

export type AssertionResult = true | string;

export type Assertion = { name: string; check: () => Promise<AssertionResult> };

export type ScenarioContext = {
    run: string;
    // Dirty files (content hashes) right after prepare(), so Claude's own changes can be told apart
    afterPrepare: Map<string, string>;
};

export type Scenario = {
    id: string;
    title: string;
    skill: string;
    estimatedCostUsd: number;
    maxTurns: number;
    tools: () => string[];
    // Path prefixes Claude may change; anything else fails the Claude stage
    allowedPrefixes: string[];
    prepare: (context: ScenarioContext) => Promise<void>;
    prompt: (context: ScenarioContext) => string;
    assertions: (context: ScenarioContext) => Assertion[];
};

const PROJECT = "Desktop Chromium";
const SUMMARY_FILE = path.join("harness-results", "summary.json");
const FAILURES_DIR = path.join("harness-results", "failures");

const absolute = (file: string) => path.join(PROJECT_ROOT, file);

function plant(file: string, from: string, to: string): void {
    const content = fs.readFileSync(absolute(file), "utf8");
    if (!content.includes(from)) throw new StageFailure(`Cannot plant the break: "${from}" not found in ${file}`);
    fs.writeFileSync(absolute(file), content.replace(from, to));
}

// Runs one spec with self-healing off and the config reporters, and requires a fresh summary with a failed test
async function runFailingSpec(spec: string, grep?: string): Promise<void> {
    const startedAt = Date.now();
    const args = ["playwright", "test", spec, ...(grep ? ["--grep", grep] : []), "--config=playwright.config.web.js", `--project=${PROJECT}`, "--forbid-only"];
    const result = await runCommand("yarn", args, { ...process.env, SELF_HEALING_DISABLED: "true" });
    const output = (result.stdout + result.stderr).trim().slice(-1500);
    if (result.code === 0) throw new StageFailure(`The planted break did not make the test fail:\n${output}`);
    if (!fs.existsSync(absolute(SUMMARY_FILE))) throw new StageFailure(`No ${SUMMARY_FILE} written:\n${output}`);
    const summary = JSON.parse(fs.readFileSync(absolute(SUMMARY_FILE), "utf8")) as RunSummary;
    if (new Date(summary.run.startedAt).getTime() < startedAt) throw new StageFailure(`${SUMMARY_FILE} is older than the failing run:\n${output}`);
    if (summary.run.totals.failed === 0) throw new StageFailure(`${SUMMARY_FILE} records no failed test:\n${output}`);
}

// Files Claude changed after prepare() (new untracked files included)
async function changedByClaude(context: ScenarioContext): Promise<string[]> {
    const after = await dirtyFileHashes();
    const changed = new Set<string>();
    for (const [file, hash] of after) if (context.afterPrepare.get(file) !== hash) changed.add(file);
    for (const file of context.afterPrepare.keys()) if (!after.has(file)) changed.add(file);
    return [...changed].sort();
}

function onlyChanged(context: ScenarioContext, prefixes: string[], label: string): Assertion {
    return {
        name: `only ${label} changed`,
        check: async () => {
            const outside = (await changedByClaude(context)).filter(file => !prefixes.some(prefix => file.startsWith(prefix)));
            return outside.length === 0 || `changed outside ${label}: ${outside.join(", ")}`;
        },
    };
}

async function yarnPasses(args: string[]): Promise<AssertionResult> {
    const result = await runCommand("yarn", args);
    return result.code === 0 || `yarn ${args.join(" ")} failed:\n${(result.stdout + result.stderr).trim().slice(-800)}`;
}

function readReport(file: string): Record<string, any> | string {
    if (!fs.existsSync(absolute(file))) return `report not written: ${file}`;
    try {
        return JSON.parse(fs.readFileSync(absolute(file), "utf8"));
    } catch (error) {
        return `report is not JSON: ${error instanceof Error ? error.message : error}`;
    }
}

const reportPath = (context: ScenarioContext, id: string) => path.join(FAILURES_DIR, `eval-${context.run}`, `${id}.json`);

function debugScenario(options: {
    id: string;
    title: string;
    testTitle: string;
    spec: string;
    grep?: string;
    plantFile: string;
    from: string;
    to: string;
    category: string;
    healingOutcome?: string;
}): Scenario {
    return {
        id: options.id,
        title: options.title,
        skill: "debug-failure",
        estimatedCostUsd: 0.3,
        maxTurns: 40,
        tools: () => skillTools("debug-failure"),
        allowedPrefixes: ["harness-results/"],
        prepare: async () => {
            plant(options.plantFile, options.from, options.to);
            await runFailingSpec(options.spec, options.grep);
        },
        prompt: context => `/debug-failure --report ${reportPath(context, options.id)} --project ${PROJECT} ${options.testTitle}`,
        assertions: context => {
            const report = reportPath(context, options.id);
            const assertions: Assertion[] = [
                { name: "report passes check-failure-report", check: () => yarnPasses(["harness:check-failure-report", report]) },
                {
                    name: `category = ${options.category}`,
                    check: async () => {
                        const content = readReport(report);
                        if (typeof content === "string") return content;
                        return content.category === options.category || `category is ${content.category}`;
                    },
                },
                {
                    name: `evidence cites ${options.plantFile}`,
                    check: async () => {
                        const content = readReport(report);
                        if (typeof content === "string") return content;
                        const files: string[] = Array.isArray(content.evidence) ? content.evidence.map((entry: { file?: string }) => entry?.file ?? "") : [];
                        return files.includes(options.plantFile) || `evidence files: ${files.join(", ") || "none"}`;
                    },
                },
            ];
            if (options.healingOutcome) {
                assertions.push({
                    name: `healing.outcome = ${options.healingOutcome}`,
                    check: async () => {
                        const content = readReport(report);
                        if (typeof content === "string") return content;
                        return content.healing?.outcome === options.healingOutcome || `healing.outcome is ${content.healing?.outcome}`;
                    },
                });
            }
            assertions.push(onlyChanged(context, ["harness-results/"], "harness-results/"));
            return assertions;
        },
    };
}

const NEWSLETTER_MESSAGE = "Eval REQ-900: thank you for subscribing to the newsletter.";
const NEWSLETTER_KEY = "newsletter";
const DATA_PROVIDER = "test-data/TestDataProvider.ts";

async function newDataFiles(context: ScenarioContext): Promise<string[]> {
    return (await changedByClaude(context)).filter(file => /^test-data\/sit\/.+Data\.json$/.test(file) && !context.afterPrepare.has(file));
}

const REQUIREMENT_FIXTURE = "harness/evals/fixtures/REQ-900-eval-product-search.md";
const REQUIREMENT = "requirements/REQ-900-eval-product-search.md";
const PLAN = "implementation-plans/REQ-900-eval-product-search.md";

export const SCENARIOS: Scenario[] = [
    debugScenario({
        id: "debug-data",
        title: "/debug-failure finds a wrong expected message in SIT test data",
        testTitle: `${TAG.smoke} | Test Credit Card Checkout`,
        spec: "tests/web/Day25/TestStandardComponent.spec.ts",
        grep: "Test Credit Card Checkout$",
        plantFile: "test-data/sit/checkout/TermsOfServiceWarningData.json",
        from: "Please accept the terms of service before the next step.",
        to: "Please accept the eval terms before you continue.",
        category: "data",
    }),
    debugScenario({
        id: "debug-locator",
        title: "/debug-failure finds a broken CSS locator in a component",
        testTitle: `${TAG.regression} | Test Cheap Component`,
        spec: "tests/web/Day25/TestCheapComponent.spec.ts",
        plantFile: "models/components/cart/TotalComponent.ts",
        from: `checkoutBtnSel = "#checkout"`,
        to: `checkoutBtnSel = "#checkout-eval-missing"`,
        category: "locator",
        healingOutcome: "DISABLED",
    }),
    {
        id: "add-test-data",
        title: "/add-test-data creates a SIT data file and registers it in TestDataProvider",
        skill: "add-test-data",
        estimatedCostUsd: 0.4,
        maxTurns: 30,
        tools: () => ["Skill", "Read", "Grep", "Glob", "Edit(test-data/**)", "Write(test-data/**)", "Bash(yarn tsc *)", "Bash(yarn playwright test --list *)"],
        allowedPrefixes: ["test-data/"],
        prepare: async () => {},
        prompt: () =>
            `/add-test-data Add SIT test data for a newsletter subscription confirmation: one field "message" with the exact value ` +
            `"${NEWSLETTER_MESSAGE}", registered under the key "${NEWSLETTER_KEY}". Do not ask questions; no spec or flow uses it yet.`,
        assertions: context => [
            {
                name: "a new test-data/sit/**/*Data.json holds the message",
                check: async () => {
                    const files = await newDataFiles(context);
                    if (files.length === 0) return "no new test-data/sit/**/*Data.json";
                    return files.some(file => fs.readFileSync(absolute(file), "utf8").includes(NEWSLETTER_MESSAGE)) || `message not found in ${files.join(", ")}`;
                },
            },
            {
                name: `TestDataProvider imports it and registers "${NEWSLETTER_KEY}" in sitData`,
                check: async () => {
                    const files = await newDataFiles(context);
                    const provider = fs.readFileSync(absolute(DATA_PROVIDER), "utf8");
                    const imported = files.some(file => provider.includes(`./${path.relative("test-data", file)}`));
                    if (!imported) return `no import of ${files.join(", ") || "a new data file"} in ${DATA_PROVIDER}`;
                    const sitData = /const\s+sitData[^=]*=\s*\{([\s\S]*?)\n\}/.exec(provider)?.[1] ?? "";
                    return new RegExp(`\\b${NEWSLETTER_KEY}\\s*:`).test(sitData) || `"${NEWSLETTER_KEY}" not registered in sitData`;
                },
            },
            { name: "tsc passes", check: () => yarnPasses(["tsc", "--noEmit"]) },
            { name: "check-arch passes", check: () => yarnPasses(["harness:check-arch"]) },
            onlyChanged(context, ["test-data/"], "test-data/"),
        ],
    },
    {
        id: "write-plan",
        title: "/write-plan turns a fixture requirement into a valid Draft plan",
        skill: "write-plan",
        estimatedCostUsd: 1.2,
        maxTurns: 80,
        tools: () => skillTools("write-plan"),
        allowedPrefixes: ["implementation-plans/"],
        prepare: async () => {
            if (fs.existsSync(absolute(REQUIREMENT)) || fs.existsSync(absolute(PLAN))) throw new StageFailure(`${REQUIREMENT} or ${PLAN} already exists`);
            fs.copyFileSync(absolute(REQUIREMENT_FIXTURE), absolute(REQUIREMENT));
        },
        prompt: () => `/write-plan ${REQUIREMENT}`,
        assertions: context => [
            { name: `${PLAN} exists`, check: async () => fs.existsSync(absolute(PLAN)) || "plan not written" },
            {
                name: "Status: Draft",
                check: async () => {
                    if (!fs.existsSync(absolute(PLAN))) return "plan not written";
                    const status = /^Status:\s*(.+?)\s*$/m.exec(fs.readFileSync(absolute(PLAN), "utf8"))?.[1];
                    return status === "Draft" || `Status is ${status ?? "missing"}`;
                },
            },
            { name: "check-plan passes", check: () => yarnPasses(["harness:check-plan", PLAN]) },
            onlyChanged(context, ["implementation-plans/"], "implementation-plans/"),
        ],
    },
];
