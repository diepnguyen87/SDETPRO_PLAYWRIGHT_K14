// Harness runner for pipeline stages 1–3: requirement → plan → OpenAI review → revision → human review.
//   yarn agent:plan knowledge-base/requirements/REQ-<nnn>-<slug>.md
//   yarn agent:plan --revise implementation-plans/REQ-<nnn>-<slug>.md   (after Status: Changes Requested)
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "../checks/markdown.js";
import { PLANS_DIR, REVIEW_DIR, Runner, StageFailure, changedOutsidePrefixes, readStatus, runCommand, setStatus } from "./runner.js";

const RUN_LOG_DIR = path.join("harness-results", "agent-plan");
// Claude stages may only change files under these folders
const ALLOWED_CHANGE_PREFIXES = [`${PLANS_DIR}/`, `${REVIEW_DIR}/`];

const WRITE_PLAN_TOOLS = [
    "Skill", "Read", "Grep", "Glob",
    `Edit(${PLANS_DIR}/**)`,
    "Bash(yarn harness:check-req *)", "Bash(yarn harness:check-plan *)", "Bash(git log *)",
    "mcp__playwright__browser_navigate", "mcp__playwright__browser_snapshot", "mcp__playwright__browser_close",
];
const REVISE_PLAN_TOOLS = [
    "Skill", "Read", "Grep", "Glob",
    `Edit(${PLANS_DIR}/**)`,
    "Bash(yarn harness:check-plan *)",
];
const MAX_TURNS = { writePlan: 80, revisePlan: 60 };

function newRunner(mode: "full" | "revise", input: string, plan: string): Runner {
    return new Runner(RUN_LOG_DIR, mode, input, plan, changedOutsidePrefixes(ALLOWED_CHANGE_PREFIXES), ALLOWED_CHANGE_PREFIXES.join(", "));
}

async function revise(runner: Runner, plan: string): Promise<void> {
    await runner.stage("revise-plan (claude -p)", () => runner.claude(`/revise-plan ${plan}`, REVISE_PLAN_TOOLS, MAX_TURNS.revisePlan));
    await runner.stage("check-plan", () => runner.check("harness:check-plan", plan));
    await runner.stage("status is Awaiting Human Review", async () => runner.expectStatus(plan, "Awaiting Human Review"));
}

async function fullRun(requirement: string): Promise<void> {
    const plan = path.join(PLANS_DIR, path.basename(requirement));
    const runner = newRunner("full", requirement, plan);
    try {
        await runner.stage("check-req", () => runner.check("harness:check-req", requirement));
        await runner.stage("plan can be (re)written", async () => {
            const status = readStatus(plan);
            if (status !== null && status !== "Draft") {
                throw new StageFailure(`${plan} is "${status}"; only a missing or Draft plan is (re)written. Use --revise for Changes Requested.`);
            }
            return { detail: status === null ? "new plan" : "overwriting Draft" };
        });
        await runner.stage("write-plan (claude -p)", () => runner.claude(`/write-plan ${requirement}`, WRITE_PLAN_TOOLS, MAX_TURNS.writePlan));
        await runner.stage("check-plan", () => runner.check("harness:check-plan", plan));
        await runner.stage("status is Draft", async () => runner.expectStatus(plan, "Draft"));
        await runner.stage("ai:review (OpenAI)", async () => {
            const result = await runCommand("yarn", ["ai:review", plan]);
            if (result.code !== 0) throw new StageFailure(`ai:review failed:\n${(result.stdout + result.stderr).trim()}`);
            const reviewFile = path.join(PROJECT_ROOT, REVIEW_DIR, `${path.basename(plan, ".md")}.plan.json`);
            const review = JSON.parse(fs.readFileSync(reviewFile, "utf8"));
            runner.setReview({ verdict: review.verdict, findings: review.findings.length });
            return { detail: `${review.verdict}, ${review.findings.length} finding(s)` };
        });
        await runner.stage("status → Plan Reviewed", async () => setStatus(plan, "Plan Reviewed"));
        await revise(runner, plan);
        runner.finish(true);
    } catch {
        runner.finish(false);
        process.exitCode = 1;
    }
}

async function reviseRun(plan: string): Promise<void> {
    const runner = newRunner("revise", plan, plan);
    try {
        await runner.stage("plan is Changes Requested", async () => runner.expectStatus(plan, "Changes Requested"));
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
    console.error("Usage: yarn agent:plan knowledge-base/requirements/REQ-<nnn>-<slug>.md | --revise implementation-plans/REQ-<nnn>-<slug>.md");
    process.exitCode = 2;
} else if (args.includes("--revise")) {
    void reviseRun(path.relative(PROJECT_ROOT, path.resolve(PROJECT_ROOT, target)));
} else {
    void fullRun(path.relative(PROJECT_ROOT, path.resolve(PROJECT_ROOT, target)));
}
