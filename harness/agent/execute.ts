// Harness runner for pipeline stage 7: execute with self-healing on, collect the result per test, and write a
// /debug-failure report for each test that still fails. Never changes code.
//   yarn agent:execute implementation-plans/<plan>.md     (Status: Accepted → spec files of its last cited test result)
//   yarn agent:execute --suite smoke|regression
//   yarn agent:execute --spec <file...>
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT, isMainModule } from "../checks/markdown.js";
import { TAG } from "../../constant/Tag.js";
import type { RunSummary, TestSummary } from "../reporters/summary-reporter.js";
import {
    Runner,
    StageFailure,
    changedOutsidePrefixes,
    citedSpecFiles,
    runCommand,
    skillTools,
} from "./runner.js";

const RUN_LOG_DIR = path.join("harness-results", "agent-execute");
const EXECUTE_DIR = path.join("harness-results", "execute");
const FAILURES_DIR = path.join("harness-results", "failures");
const SUMMARY_FILE = path.join("harness-results", "summary.json");
const PROJECT = "Desktop Chromium";
const MAX_DEBUG = 3;
const DEBUG_MAX_TURNS = 40;
const SUITES: Record<string, string> = { smoke: TAG.smoke, regression: TAG.regression };
const USAGE = "Usage: yarn agent:execute implementation-plans/<plan>.md | --suite smoke|regression | --spec <file...>";

type Input = { kind: "plan"; plan: string } | { kind: "suite"; suite: string } | { kind: "spec"; specs: string[] };

type TestRow = {
    title: string;
    file: string;
    status: string;
    outcome: string;
    healing: TestSummary["healing"];
    report?: string;
    category?: string;
    rootCause?: string;
    debugError?: string;
    claude?: { turns?: number; costUsd?: number };
};

export function parseInput(args: string[]): Input {
    const suiteIndex = args.indexOf("--suite");
    const specIndex = args.indexOf("--spec");
    const positional = args.filter((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--suite" && (specIndex === -1 || index < specIndex));
    const given = [suiteIndex !== -1, specIndex !== -1, positional.length > 0].filter(Boolean).length;
    if (given !== 1) throw new Error(USAGE);

    if (suiteIndex !== -1) {
        const suite = args[suiteIndex + 1];
        if (!suite || !(suite in SUITES)) throw new Error(`Unknown suite "${suite ?? ""}". ${USAGE}`);
        return { kind: "suite", suite };
    }
    if (specIndex !== -1) {
        const specs = args.slice(specIndex + 1).filter(arg => !arg.startsWith("--"));
        if (specs.length === 0) throw new Error(USAGE);
        for (const spec of specs) {
            if (!spec.startsWith("tests/web/") || !spec.endsWith(".spec.ts") || !fs.existsSync(path.join(PROJECT_ROOT, spec))) throw new Error(`Not a spec under tests/web/: ${spec}`);
        }
        return { kind: "spec", specs };
    }
    const plan = path.relative(PROJECT_ROOT, path.resolve(PROJECT_ROOT, positional[0]));
    if (positional.length !== 1 || !fs.existsSync(path.join(PROJECT_ROOT, plan))) throw new Error(`Plan not found: ${positional[0]}. ${USAGE}`);
    return { kind: "plan", plan };
}

// Failed tests that self-healing did not fix, in summary order, capped
export function selectForDebug(tests: TestSummary[], cap = MAX_DEBUG): { debug: TestSummary[]; notDebugged: TestSummary[] } {
    const candidates = tests.filter(test => test.outcome === "unexpected" && test.healing.outcome !== "HEALED");
    return { debug: candidates.slice(0, cap), notDebugged: candidates.slice(cap) };
}

const slug = (text: string) => text.replace(/\W+/g, "_");

function patchDiff(file: string): Promise<string> {
    return runCommand("git", ["ls-files", "--error-unmatch", "--", file]).then(async tracked => {
        const args = tracked.code === 0 ? ["diff", "--", file] : ["diff", "--no-index", "--", "/dev/null", file];
        return (await runCommand("git", args)).stdout;
    });
}

async function execute(input: Input): Promise<void> {
    const startedAt = new Date();
    const run = startedAt.toISOString().replace(/[:.]/g, "-");
    const label = input.kind === "plan" ? input.plan : input.kind === "suite" ? `suite-${input.suite}` : "spec";
    // Claude may write only under harness-results/ (gitignored): any other change fails its stage
    const runner = new Runner(RUN_LOG_DIR, `execute-${input.kind}`, label, label, changedOutsidePrefixes(["harness-results/"]), "harness-results/");
    const rows: TestRow[] = [];
    let summary: RunSummary | undefined;
    let playwrightExit = 0;
    let command: string[] = [];
    const healingPatches: Array<{ file: string; diff: string }> = [];
    let notDebugged: string[] = [];
    let debugFailures = 0;

    try {
        if (input.kind === "plan") {
            await runner.stage("check-plan", () => runner.check("harness:check-plan", input.plan));
            await runner.stage("status is Accepted", async () => runner.expectStatus(input.plan, "Accepted"));
        }
        await runner.stage("no modified tracked file", async () => {
            const { stdout } = await runCommand("git", ["status", "--porcelain", "--untracked-files=no"]);
            if (stdout.trim()) throw new StageFailure(`Commit or stash first, so source changes after the run are healing patches:\n${stdout.trim()}`);
        });
        await runner.stage("harness:clean", async () => {
            const result = await runCommand("yarn", ["harness:clean"]);
            if (result.code !== 0) throw new StageFailure(result.stdout + result.stderr);
            return { detail: result.stdout.trim().split("\n").pop() };
        });

        await runner.stage("playwright test (self-healing on)", async () => {
            const selection = input.kind === "plan" ? citedSpecFiles(input.plan).specs : input.kind === "spec" ? input.specs : ["--grep", SUITES[input.suite]];
            command = ["playwright", "test", ...selection, "--config=playwright.config.web.js", `--project=${PROJECT}`, "--forbid-only"];
            const result = await runCommand("yarn", command);
            playwrightExit = result.code;
            runner.log.testResults = [SUMMARY_FILE];
            if (!fs.existsSync(path.join(PROJECT_ROOT, SUMMARY_FILE))) throw new StageFailure(`No summary written:\n${(result.stdout + result.stderr).trim().slice(-2000)}`);
            summary = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, SUMMARY_FILE), "utf8")) as RunSummary;
            if (new Date(summary.run.startedAt).getTime() < startedAt.getTime()) throw new StageFailure(`${SUMMARY_FILE} is older than this run:\n${(result.stdout + result.stderr).trim().slice(-2000)}`);
            const archive = path.join(EXECUTE_DIR, `${run}.summary.json`);
            fs.mkdirSync(path.join(PROJECT_ROOT, EXECUTE_DIR), { recursive: true });
            fs.copyFileSync(path.join(PROJECT_ROOT, SUMMARY_FILE), path.join(PROJECT_ROOT, archive));
            const totals = summary.run.totals;
            return { detail: `exit ${playwrightExit} — ${totals.passed} passed, ${totals.failed} failed, ${totals.flaky} flaky, ${totals.skipped} skipped, ${totals.healed} healed; ${archive}` };
        });

        const current = summary!;
        for (const test of current.tests) {
            rows.push({ title: test.title, file: test.file, status: test.status, outcome: test.outcome, healing: test.healing });
        }

        await runner.stage("healing patches", async () => {
            for (const file of current.sourceChanges) healingPatches.push({ file, diff: await patchDiff(file) });
            return { detail: current.sourceChanges.length === 0 ? "none" : `${current.sourceChanges.length} file(s) changed — review the patch, the .bak is kept` };
        });

        const { debug, notDebugged: skipped } = selectForDebug(current.tests);
        notDebugged = skipped.map(test => test.title);
        for (const test of debug) {
            const row = rows.find(candidate => candidate.title === test.title && candidate.file === test.file)!;
            const report = path.join(FAILURES_DIR, run, `${slug(test.project)}.${slug(test.title)}.json`);
            try {
                await runner.stage(`debug-failure: ${test.title}`, async () => {
                    const extra = await runner.claude(`/debug-failure --report ${report} --project ${test.project} ${test.title}`, skillTools("debug-failure"), DEBUG_MAX_TURNS);
                    row.claude = { turns: extra.claude?.turns, costUsd: extra.claude?.costUsd };
                    const check = await runCommand("yarn", ["harness:check-failure-report", report]);
                    if (check.code !== 0) throw new StageFailure(`harness:check-failure-report failed:\n${check.stdout.trim()}`);
                    const content = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, report), "utf8"));
                    Object.assign(row, { report, category: content.category, rootCause: content.rootCause });
                    return { ...extra, detail: `${content.category} (confidence ${content.confidence}) — ${report}` };
                });
            } catch (error) {
                debugFailures++;
                row.debugError = error instanceof Error ? error.message.split("\n")[0] : String(error);
            }
        }

        const clean = playwrightExit === 0 && current.run.totals.failed === 0 && current.run.totals.flaky === 0 && current.run.totals.healed === 0 && current.sourceChanges.length === 0 && debugFailures === 0;
        await runner.stage("write result", async () => {
            const resultFile = path.join(EXECUTE_DIR, `${run}.json`);
            const result = {
                input,
                startedAt: startedAt.toISOString(),
                finishedAt: new Date().toISOString(),
                command: `yarn ${command.join(" ")}`,
                playwrightExit,
                totals: current.run.totals,
                summary: path.join(EXECUTE_DIR, `${run}.summary.json`),
                tests: rows,
                healingPatches,
                bakFiles: current.sourceChanges.filter(file => file.endsWith(".bak")),
                notDebugged,
                clean,
            };
            fs.writeFileSync(path.join(PROJECT_ROOT, resultFile), JSON.stringify(result, null, 2) + "\n");
            return { detail: resultFile };
        });

        printTable(rows, healingPatches, notDebugged);
        // The runner completed; the exit code carries the test outcome
        runner.finish(true);
        console.log(clean ? "RESULT: clean — every test passed without healing" : "RESULT: not clean — failed tests, healing or debug errors above (exit 1)");
        if (!clean) process.exitCode = 1;
    } catch {
        runner.finish(false);
        process.exitCode = 1;
    }
}

function printTable(rows: TestRow[], patches: Array<{ file: string }>, notDebugged: string[]): void {
    console.log("\nstatus     | healing  | category    | test → report");
    for (const row of rows) {
        const detail = row.report ?? row.debugError ?? "";
        console.log(`${row.status.padEnd(10)} | ${row.healing.outcome.padEnd(8)} | ${(row.category ?? "").padEnd(11)} | ${row.title}${detail ? ` → ${detail}` : ""}`);
    }
    if (patches.length > 0) console.log(`Healing patches (uncommitted, review them): ${patches.map(patch => patch.file).join(", ")}`);
    if (notDebugged.length > 0) console.log(`Not debugged (cap ${MAX_DEBUG}): ${notDebugged.join("; ")}`);
}

if (isMainModule(import.meta.url)) {
    try {
        void execute(parseInput(process.argv.slice(2)));
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 2;
    }
}
