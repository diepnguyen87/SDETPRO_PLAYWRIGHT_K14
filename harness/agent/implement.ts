// Harness runner for pipeline stages 4–6: implement → OpenAI code review → revision → human code review.
//   yarn agent:implement implementation-plans/<plan>.md             (Status: Approved, clean working tree)
//   yarn agent:implement --revise implementation-plans/<plan>.md    (after Status: Code Changes Requested)
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "../checks/markdown.js";
import {
    REVIEW_DIR,
    Runner,
    ScopeCheck,
    StageFailure,
    assertTestsPassed,
    lastCitedTestResult,
    readStatus,
    resultFilesSince,
    runCommand,
    setStatus,
    skillTools,
    testResultFiles,
} from "./runner.js";

const RUN_LOG_DIR = path.join("harness-results", "agent-implement");
const MAX_TURNS = { implementPlan: 150, reviseCode: 100 };
// harness:run-tests calls per Claude stage: one per round (first run + 3 fix rounds; revise-code: 3 rounds)
const MAX_TEST_RUNS = { implementPlan: 4, reviseCode: 3 };

// Claude may change only the plan's Relevant Files, the plan itself and implementation-review/
const planScope = (plan: string): ScopeCheck => async () => {
    const result = await runCommand("yarn", ["harness:check-scope", plan, "--json"]);
    try {
        return JSON.parse(result.stdout).outOfScope as string[];
    } catch {
        throw new StageFailure(`harness:check-scope returned no JSON: ${(result.stdout + result.stderr).slice(0, 500)}`);
    }
};

function newRunner(mode: "full" | "revise", plan: string): Runner {
    return new Runner(RUN_LOG_DIR, mode, plan, plan, planScope(plan), `${plan} Relevant Files`);
}

// Runs a Claude skill stage and enforces the fix-round cap by counting the test result files it wrote
async function claudeStage(runner: Runner, skill: string, plan: string, maxTurns: number, maxTestRuns: number): Promise<void> {
    const before = testResultFiles();
    await runner.stage(`${skill} (claude -p)`, () => runner.claude(`/${skill} ${plan}`, skillTools(skill), maxTurns));
    await runner.stage(`${skill}: test runs ≤ ${maxTestRuns}`, async () => {
        const runs = resultFilesSince(before);
        runner.log.testResults = [...(runner.log.testResults ?? []), ...runs];
        if (runs.length > maxTestRuns) throw new StageFailure(`${runs.length} harness:run-tests calls, limit ${maxTestRuns}: ${runs.join(", ")}`);
        return { detail: `${runs.length} run(s)` };
    });
}

async function citedTestsPassed(runner: Runner, plan: string): Promise<void> {
    await runner.stage("cited test result passed", async () => {
        const { file, summary } = lastCitedTestResult(plan);
        return { detail: assertTestsPassed(file, summary) };
    });
}

function blockedReason(plan: string): string {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, plan), "utf8");
    return /^\s*Blocked:\s*([\s\S]*?)(?=\n\s*\n|\n##\s|$)/m.exec(content)?.[1].trim() ?? "no Blocked: entry in Implementation Notes";
}

async function revise(runner: Runner, plan: string): Promise<void> {
    await claudeStage(runner, "revise-code", plan, MAX_TURNS.reviseCode, MAX_TEST_RUNS.reviseCode);
    await runner.stage("status is Awaiting Human Code Review", async () => {
        if (readStatus(plan) !== "Awaiting Human Code Review") {
            throw new StageFailure(`Status is "${readStatus(plan)}"; Blocked: ${blockedReason(plan)}`);
        }
    });
    await runner.gates(plan);
    await citedTestsPassed(runner, plan);
    await runner.stage("check-plan", () => runner.check("harness:check-plan", plan));
}

async function fullRun(plan: string): Promise<void> {
    const runner = newRunner("full", plan);
    try {
        await runner.stage("check-plan", () => runner.check("harness:check-plan", plan));
        await runner.stage("status is Approved", async () => runner.expectStatus(plan, "Approved"));
        await runner.stage("working tree is clean", async () => {
            const { stdout } = await runCommand("git", ["status", "--porcelain"]);
            if (stdout.trim()) throw new StageFailure(`Commit the approval first; the diff must contain only the agent's work:\n${stdout.trim()}`);
        });
        await claudeStage(runner, "implement-plan", plan, MAX_TURNS.implementPlan, MAX_TEST_RUNS.implementPlan);
        await runner.stage("status is Implemented", async () => {
            const status = readStatus(plan);
            if (status === "Approved") throw new StageFailure(`Blocked: ${blockedReason(plan)}`);
            if (status !== "Implemented") throw new StageFailure(`Expected Status "Implemented", found "${status}"`);
        });
        await runner.gates(plan);
        await citedTestsPassed(runner, plan);
        await runner.stage("ai:review --mode code (OpenAI)", async () => {
            const result = await runCommand("yarn", ["ai:review", plan, "--mode", "code"]);
            if (result.code !== 0) throw new StageFailure(`ai:review failed:\n${(result.stdout + result.stderr).trim()}`);
            const reviewFile = path.join(PROJECT_ROOT, REVIEW_DIR, `${path.basename(plan, ".md")}.code.json`);
            const review = JSON.parse(fs.readFileSync(reviewFile, "utf8"));
            runner.log.codeReview = { verdict: review.verdict, findings: review.findings.length };
            return { detail: `${review.verdict}, ${review.findings.length} finding(s)` };
        });
        await runner.stage("status → Code Reviewed", async () => setStatus(plan, "Code Reviewed"));
        await revise(runner, plan);
        runner.finish(true);
    } catch {
        runner.finish(false);
        process.exitCode = 1;
    }
}

async function reviseRun(plan: string): Promise<void> {
    const runner = newRunner("revise", plan);
    try {
        await runner.stage("plan is Code Changes Requested", async () => runner.expectStatus(plan, "Code Changes Requested"));
        await revise(runner, plan);
        runner.finish(true);
    } catch {
        runner.finish(false);
        process.exitCode = 1;
    }
}

const args = process.argv.slice(2);
const target = args.find(arg => !arg.startsWith("--"));

if (!target || !fs.existsSync(path.resolve(PROJECT_ROOT, target))) {
    console.error("Usage: yarn agent:implement [--revise] implementation-plans/<plan>.md");
    process.exitCode = 2;
} else {
    const plan = path.relative(PROJECT_ROOT, path.resolve(PROJECT_ROOT, target));
    void (args.includes("--revise") ? reviseRun(plan) : fullRun(plan));
}
