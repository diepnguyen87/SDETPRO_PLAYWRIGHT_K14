// Harness runner for pipeline stages 1–3: requirement → plan → OpenAI review → revision → human review.
//   yarn agent:plan requirements/REQ-<nnn>-<slug>.md
//   yarn agent:plan --revise implementation-plans/REQ-<nnn>-<slug>.md   (after Status: Changes Requested)
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "../checks/markdown.js";

const PLANS_DIR = "implementation-plans";
const REVIEW_DIR = "implementation-review";
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

type StageLog = {
    stage: string;
    ok: boolean;
    durationMs: number;
    detail?: string;
    claude?: { turns?: number; costUsd?: number; permissionDenials?: number };
};

type RunLog = {
    mode: "full" | "revise";
    input: string;
    plan: string;
    startedAt: string;
    finishedAt?: string;
    ok: boolean;
    stages: StageLog[];
    review?: { verdict: string; findings: number };
};

type CommandResult = { code: number; stdout: string; stderr: string };

class StageFailure extends Error {}

function runCommand(command: string, args: string[]): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { cwd: PROJECT_ROOT, env: process.env });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", chunk => (stdout += chunk));
        child.stderr.on("data", chunk => (stderr += chunk));
        child.on("error", reject);
        child.on("close", code => resolve({ code: code ?? 1, stdout, stderr }));
    });
}

function readStatus(planPath: string): string | null {
    if (!fs.existsSync(planPath)) return null;
    return /^Status:\s*(.+?)\s*$/m.exec(fs.readFileSync(planPath, "utf8"))?.[1] ?? null;
}

function setStatus(planPath: string, status: string): void {
    const content = fs.readFileSync(planPath, "utf8");
    if (!/^Status:/m.test(content)) throw new StageFailure(`No Status line in ${planPath}`);
    fs.writeFileSync(planPath, content.replace(/^Status:.*$/m, `Status: ${status}`));
}

// Content hash of every dirty file, so a second change to an already-dirty file is still detected
async function dirtyFileHashes(): Promise<Map<string, string>> {
    const { stdout } = await runCommand("git", ["status", "--porcelain=v1", "--untracked-files=all", "-z"]);
    const hashes = new Map<string, string>();
    const entries = stdout.split("\0").filter(Boolean);
    for (let index = 0; index < entries.length; index++) {
        const entry = entries[index];
        const file = entry.slice(3);
        // Renames are followed by the original path as a separate entry
        if (entry[0] === "R" || entry[0] === "C") index++;
        const absolute = path.join(PROJECT_ROOT, file);
        hashes.set(file, fs.existsSync(absolute) ? createHash("sha1").update(fs.readFileSync(absolute)).digest("hex") : "deleted");
    }
    return hashes;
}

async function changedOutsideScope(before: Map<string, string>): Promise<string[]> {
    const after = await dirtyFileHashes();
    const changed = new Set<string>();
    for (const [file, hash] of after) if (before.get(file) !== hash) changed.add(file);
    for (const file of before.keys()) if (!after.has(file)) changed.add(file);
    return [...changed].filter(file => !ALLOWED_CHANGE_PREFIXES.some(prefix => file.startsWith(prefix)));
}

class Runner {
    private readonly log: RunLog;
    private readonly logFile: string;

    constructor(mode: RunLog["mode"], input: string, plan: string) {
        this.log = { mode, input, plan, startedAt: new Date().toISOString(), ok: false, stages: [] };
        const stamp = this.log.startedAt.replace(/[:.]/g, "-");
        this.logFile = path.join(PROJECT_ROOT, RUN_LOG_DIR, `${path.basename(plan, ".md")}-${stamp}.json`);
    }

    async stage(name: string, action: () => Promise<Partial<StageLog> | void>): Promise<void> {
        const start = Date.now();
        console.log(`▶ ${name}`);
        try {
            const extra = (await action()) ?? {};
            this.log.stages.push({ stage: name, ok: true, durationMs: Date.now() - start, ...extra });
            console.log(`  ✓ ${name}${extra.detail ? ` — ${extra.detail}` : ""}`);
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            this.log.stages.push({ stage: name, ok: false, durationMs: Date.now() - start, detail });
            console.error(`  ✗ ${name} — ${detail}`);
            throw error;
        }
    }

    async check(script: "harness:check-req" | "harness:check-plan", file: string): Promise<Partial<StageLog>> {
        const result = await runCommand("yarn", [script, file]);
        if (result.code !== 0) throw new StageFailure(`${script} failed:\n${result.stdout.trim()}`);
        return { detail: result.stdout.trim() };
    }

    async claude(prompt: string, tools: string[], maxTurns: number): Promise<Partial<StageLog>> {
        const before = await dirtyFileHashes();
        const result = await runCommand("claude", [
            "-p", prompt,
            "--output-format", "json",
            "--max-turns", String(maxTurns),
            "--allowedTools", ...tools,
        ]);

        let output: { is_error?: boolean; result?: string; num_turns?: number; total_cost_usd?: number; permission_denials?: unknown[] } = {};
        try {
            output = JSON.parse(result.stdout);
        } catch {
            throw new StageFailure(`claude -p returned no JSON (exit ${result.code}): ${(result.stderr || result.stdout).slice(0, 500)}`);
        }
        const claude = { turns: output.num_turns, costUsd: output.total_cost_usd, permissionDenials: output.permission_denials?.length ?? 0 };

        const outOfScope = await changedOutsideScope(before);
        if (outOfScope.length > 0) {
            throw new StageFailure(`Claude changed files outside ${ALLOWED_CHANGE_PREFIXES.join(", ")} (not reverted): ${outOfScope.join(", ")}`);
        }
        if (result.code !== 0 || output.is_error) {
            throw new StageFailure(`claude -p failed (exit ${result.code}): ${(output.result ?? result.stderr).slice(0, 500)}`);
        }
        console.log(`  ${(output.result ?? "").split("\n").slice(0, 8).join("\n  ")}`);
        return { claude, detail: `${claude.turns} turns, $${claude.costUsd?.toFixed(2)}` };
    }

    expectStatus(planPath: string, expected: string): void {
        const status = readStatus(planPath);
        if (status !== expected) throw new StageFailure(`Expected Status "${expected}" in ${planPath}, found "${status}"`);
    }

    setReview(review: RunLog["review"]): void {
        this.log.review = review;
    }

    finish(ok: boolean): void {
        this.log.ok = ok;
        this.log.finishedAt = new Date().toISOString();
        fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
        fs.writeFileSync(this.logFile, JSON.stringify(this.log, null, 2) + "\n");
        console.log(`${ok ? "DONE" : "STOPPED"} — run log: ${path.relative(PROJECT_ROOT, this.logFile)}`);
    }
}

async function revise(runner: Runner, plan: string): Promise<void> {
    await runner.stage("revise-plan (claude -p)", () => runner.claude(`/revise-plan ${plan}`, REVISE_PLAN_TOOLS, MAX_TURNS.revisePlan));
    await runner.stage("check-plan", () => runner.check("harness:check-plan", plan));
    await runner.stage("status is Awaiting Human Review", async () => runner.expectStatus(plan, "Awaiting Human Review"));
}

async function fullRun(requirement: string): Promise<void> {
    const plan = path.join(PLANS_DIR, path.basename(requirement));
    const runner = new Runner("full", requirement, plan);
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
    const runner = new Runner("revise", plan, plan);
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
    console.error("Usage: yarn agent:plan requirements/REQ-<nnn>-<slug>.md | --revise implementation-plans/REQ-<nnn>-<slug>.md");
    process.exitCode = 2;
} else if (args.includes("--revise")) {
    void reviseRun(path.relative(PROJECT_ROOT, path.resolve(PROJECT_ROOT, target)));
} else {
    void fullRun(path.relative(PROJECT_ROOT, path.resolve(PROJECT_ROOT, target)));
}
