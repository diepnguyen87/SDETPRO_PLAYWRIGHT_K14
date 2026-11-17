// Shared building blocks of the harness runners (agent:plan, agent:implement, agent:accept).
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "../checks/markdown.js";

export const PLANS_DIR = "implementation-plans";
export const REVIEW_DIR = "implementation-review";
export const TEST_RESULTS_DIR = path.join("harness-results", "tests");

export type StageLog = {
    stage: string;
    ok: boolean;
    durationMs: number;
    detail?: string;
    claude?: { turns?: number; costUsd?: number; permissionDenials?: number };
};

export type RunLog = {
    mode: string;
    input: string;
    plan: string;
    startedAt: string;
    finishedAt?: string;
    ok: boolean;
    stages: StageLog[];
    review?: { verdict: string; findings: number };
    codeReview?: { verdict: string; findings: number };
    testResults?: string[];
    commit?: string;
};

export type CommandResult = { code: number; stdout: string; stderr: string };

// Returns the files a Claude stage changed that it was not allowed to change
export type ScopeCheck = (before: Map<string, string>) => Promise<string[]>;

export class StageFailure extends Error {}

export function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv = process.env): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { cwd: PROJECT_ROOT, env });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", chunk => (stdout += chunk));
        child.stderr.on("data", chunk => (stderr += chunk));
        child.on("error", reject);
        child.on("close", code => resolve({ code: code ?? 1, stdout, stderr }));
    });
}

export function readStatus(planPath: string): string | null {
    if (!fs.existsSync(planPath)) return null;
    return /^Status:\s*(.+?)\s*$/m.exec(fs.readFileSync(planPath, "utf8"))?.[1] ?? null;
}

export function setStatus(planPath: string, status: string): void {
    const content = fs.readFileSync(planPath, "utf8");
    if (!/^Status:/m.test(content)) throw new StageFailure(`No Status line in ${planPath}`);
    fs.writeFileSync(planPath, content.replace(/^Status:.*$/m, `Status: ${status}`));
}

// Content hash of every dirty file, so a second change to an already-dirty file is still detected
export async function dirtyFileHashes(): Promise<Map<string, string>> {
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

// Scope check for stages that may only change files under fixed folders
export function changedOutsidePrefixes(prefixes: string[]): ScopeCheck {
    return async before => {
        const after = await dirtyFileHashes();
        const changed = new Set<string>();
        for (const [file, hash] of after) if (before.get(file) !== hash) changed.add(file);
        for (const file of before.keys()) if (!after.has(file)) changed.add(file);
        return [...changed].filter(file => !prefixes.some(prefix => file.startsWith(prefix)));
    };
}

// The allowed-tools line of a skill, so the runner grants exactly what the skill declares
export function skillTools(skill: string): string[] {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, ".claude", "skills", skill, "SKILL.md"), "utf8");
    const line = /^allowed-tools:\s*(.+)$/m.exec(content)?.[1];
    if (!line) throw new StageFailure(`No allowed-tools line in .claude/skills/${skill}/SKILL.md`);
    return ["Skill", ...line.split(",").map(tool => tool.trim()).filter(Boolean)];
}

// Result files written by yarn harness:run-tests (the raw Playwright report is removed after each run)
export function testResultFiles(): Set<string> {
    const folder = path.join(PROJECT_ROOT, TEST_RESULTS_DIR);
    if (!fs.existsSync(folder)) return new Set();
    return new Set(fs.readdirSync(folder).filter(file => file.endsWith(".json") && !file.endsWith(".playwright.json")).map(file => path.join(TEST_RESULTS_DIR, file)));
}

export function resultFilesSince(before: Set<string>): string[] {
    return [...testResultFiles()].filter(file => !before.has(file)).sort();
}

export type TestResultSummary = { exitCode: number; passed: number; failed: number; skipped: number; tests: Array<{ file: string; status: string }> };

// The last harness-results/tests/<timestamp>.json cited in the plan's Implementation Notes (the final test run)
export function lastCitedTestResult(planPath: string): { file: string; summary: TestResultSummary } {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, planPath), "utf8");
    const notes = /##\s+Implementation Notes\s*\n([\s\S]*?)(?=\n##\s+|$)/i.exec(content)?.[1] ?? "";
    const file = [...notes.matchAll(/harness-results\/tests\/[\w.-]+\.json/g)].map(match => match[0]).pop();
    if (!file) throw new StageFailure(`Implementation Notes of ${planPath} cite no harness-results/tests/<timestamp>.json`);
    const absolute = path.join(PROJECT_ROOT, file);
    if (!fs.existsSync(absolute)) throw new StageFailure(`Cited test result not found: ${file}`);
    return { file, summary: JSON.parse(fs.readFileSync(absolute, "utf8")) };
}

export function assertTestsPassed(file: string, summary: TestResultSummary): string {
    if (summary.exitCode !== 0 || summary.failed > 0 || summary.passed === 0) {
        throw new StageFailure(`${file}: exit ${summary.exitCode}, ${summary.passed} passed, ${summary.failed} failed`);
    }
    return `${file}: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped`;
}

export class Runner {
    readonly log: RunLog;
    private readonly logFile: string;

    constructor(logDir: string, mode: string, input: string, plan: string, private readonly scopeCheck: ScopeCheck, private readonly scopeLabel: string) {
        this.log = { mode, input, plan, startedAt: new Date().toISOString(), ok: false, stages: [] };
        const stamp = this.log.startedAt.replace(/[:.]/g, "-");
        this.logFile = path.join(PROJECT_ROOT, logDir, `${path.basename(plan, ".md")}-${stamp}.json`);
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

        const outOfScope = await this.scopeCheck(before);
        if (outOfScope.length > 0) {
            throw new StageFailure(`Claude changed files outside ${this.scopeLabel} (not reverted): ${outOfScope.join(", ")}`);
        }
        if (result.code !== 0 || output.is_error) {
            throw new StageFailure(`claude -p failed (exit ${result.code}): ${(output.result ?? result.stderr).slice(0, 500)}`);
        }
        console.log(`  ${(output.result ?? "").split("\n").slice(0, 8).join("\n  ")}`);
        return { claude, detail: `${claude.turns} turns, $${claude.costUsd?.toFixed(2)}` };
    }

    // tsc, arch-check, scope-check and --list, each logged as its own stage
    async gates(planPath: string): Promise<void> {
        const gates: Array<[string, string[]]> = [
            ["gate: tsc", ["tsc", "--noEmit"]],
            ["gate: check-arch", ["harness:check-arch"]],
            ["gate: check-scope", ["harness:check-scope", planPath]],
            ["gate: --list", ["playwright", "test", "--list", "--config=playwright.config.web.js"]],
        ];
        for (const [name, args] of gates) {
            await this.stage(name, async () => {
                const result = await runCommand("yarn", args);
                const output = (result.stdout + result.stderr).trim();
                if (result.code !== 0) throw new StageFailure(`yarn ${args.join(" ")} failed:\n${output.slice(-2000)}`);
                return { detail: output.split("\n").pop() };
            });
        }
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
