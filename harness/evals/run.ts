// Agent evals: re-run fixed skill scenarios headless and check the results deterministically. Costs Claude credits,
// so it runs only on demand and only with explicit ids or --all.
//   yarn harness:eval [--list]                → list the scenarios, run nothing
//   yarn harness:eval <id...> | --all [--max-turns <n>]
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT, isMainModule } from "../checks/markdown.js";
import { Runner, StageFailure, changedOutsidePrefixes, dirtyFileHashes, runCommand } from "../agent/runner.js";
import { SCENARIOS, type Scenario, type ScenarioContext } from "./scenarios.js";

const EVALS_DIR = path.join("harness-results", "evals");
const USAGE = "Usage: yarn harness:eval [--list] | <id...> | --all [--max-turns <n>]";

type AssertionLog = { name: string; ok: boolean; reason?: string };

type ScenarioLog = {
    id: string;
    passed: boolean;
    durationMs: number;
    error?: string;
    claude?: { turns?: number; costUsd?: number; permissionDenials?: number };
    assertions: AssertionLog[];
    restore: { ok: boolean; detail: string };
};

type Selection = { list: true } | { list: false; scenarios: Scenario[]; maxTurns?: number };

export function parseArgs(args: string[]): Selection {
    if (args.length === 0 || (args.length === 1 && args[0] === "--list")) return { list: true };
    let maxTurns: number | undefined;
    const turnsIndex = args.indexOf("--max-turns");
    if (turnsIndex !== -1) {
        maxTurns = Number(args[turnsIndex + 1]);
        if (!Number.isInteger(maxTurns) || maxTurns < 1) throw new Error(`--max-turns needs a positive integer. ${USAGE}`);
    }
    const rest = turnsIndex === -1 ? args : args.filter((_, index) => index !== turnsIndex && index !== turnsIndex + 1);
    if (rest.includes("--all")) {
        if (rest.length !== 1) throw new Error(`--all takes no ids. ${USAGE}`);
        return { list: false, scenarios: SCENARIOS, maxTurns };
    }
    if (rest.length === 0) throw new Error(USAGE);
    const scenarios = rest.map(id => {
        const scenario = SCENARIOS.find(candidate => candidate.id === id);
        if (!scenario) throw new Error(`Unknown scenario "${id}". Known: ${SCENARIOS.map(candidate => candidate.id).join(", ")}`);
        return scenario;
    });
    return { list: false, scenarios, maxTurns };
}

function printList(): void {
    console.log("id            | skill          | est.  | title");
    for (const scenario of SCENARIOS) {
        console.log(`${scenario.id.padEnd(13)} | ${scenario.skill.padEnd(14)} | $${scenario.estimatedCostUsd.toFixed(1).padEnd(4)} | ${scenario.title}`);
    }
    const total = SCENARIOS.reduce((sum, scenario) => sum + scenario.estimatedCostUsd, 0);
    console.log(`--all ≈ $${total.toFixed(1)} in Claude credits. Run with ids or --all.`);
}

async function modifiedTrackedFiles(): Promise<string[]> {
    const { stdout } = await runCommand("git", ["status", "--porcelain", "--untracked-files=no"]);
    return stdout.split("\n").filter(Boolean).map(line => line.slice(3));
}

async function untrackedFiles(): Promise<Set<string>> {
    const { stdout } = await runCommand("git", ["status", "--porcelain", "--untracked-files=all"]);
    return new Set(stdout.split("\n").filter(line => line.startsWith("?? ")).map(line => line.slice(3)));
}

// Tracked changes back to HEAD, untracked files created during the scenario deleted
async function restore(untrackedAtStart: Set<string>): Promise<{ ok: boolean; detail: string }> {
    const tracked = await modifiedTrackedFiles();
    if (tracked.length > 0) {
        const result = await runCommand("git", ["restore", "--source=HEAD", "--staged", "--worktree", "--", ...tracked]);
        if (result.code !== 0) return { ok: false, detail: `git restore failed: ${result.stderr.trim()}` };
    }
    const created = [...(await untrackedFiles())].filter(file => !untrackedAtStart.has(file));
    for (const file of created) fs.rmSync(path.join(PROJECT_ROOT, file), { force: true });

    const leftTracked = await modifiedTrackedFiles();
    const leftUntracked = [...(await untrackedFiles())].filter(file => !untrackedAtStart.has(file));
    if (leftTracked.length > 0 || leftUntracked.length > 0) {
        return { ok: false, detail: `left after restore: ${[...leftTracked, ...leftUntracked].join(", ")}` };
    }
    const restored = [...tracked, ...created];
    return { ok: true, detail: restored.length === 0 ? "nothing to restore" : `restored ${restored.join(", ")}` };
}

async function runScenario(scenario: Scenario, run: string, maxTurns: number | undefined): Promise<ScenarioLog> {
    const start = Date.now();
    const log: ScenarioLog = { id: scenario.id, passed: false, durationMs: 0, assertions: [], restore: { ok: false, detail: "not run" } };
    console.log(`\n=== ${scenario.id} — ${scenario.title}`);

    const modified = await modifiedTrackedFiles();
    if (modified.length > 0) {
        log.error = `modified tracked files at start: ${modified.join(", ")}`;
        log.restore = { ok: false, detail: "not attempted (tree was not clean)" };
        console.error(`  ✗ ${log.error}`);
        return log;
    }
    const untrackedAtStart = await untrackedFiles();
    const runner = new Runner(path.join(EVALS_DIR, "stages"), "eval", scenario.id, `${run}-${scenario.id}`, changedOutsidePrefixes(scenario.allowedPrefixes), scenario.allowedPrefixes.join(", "));
    const context: ScenarioContext = { run, afterPrepare: new Map() };

    try {
        await runner.stage("prepare", async () => {
            await scenario.prepare(context);
            context.afterPrepare = await dirtyFileHashes();
        });
        try {
            await runner.stage(`/${scenario.skill} (claude -p)`, async () => {
                const extra = await runner.claude(scenario.prompt(context), scenario.tools(), maxTurns ?? scenario.maxTurns);
                log.claude = extra.claude;
                return extra;
            });
        } catch (error) {
            log.error = error instanceof Error ? error.message.split("\n")[0] : String(error);
        }
        for (const assertion of scenario.assertions(context)) {
            let result: true | string;
            try {
                result = await assertion.check();
            } catch (error) {
                result = error instanceof Error ? error.message : String(error);
            }
            log.assertions.push(result === true ? { name: assertion.name, ok: true } : { name: assertion.name, ok: false, reason: result });
            console.log(`  ${result === true ? "✓" : "✗"} ${assertion.name}${result === true ? "" : ` — ${result.split("\n")[0]}`}`);
        }
    } catch (error) {
        log.error = log.error ?? (error instanceof Error ? error.message.split("\n")[0] : String(error));
    } finally {
        log.restore = await restore(untrackedAtStart);
        console.log(`  ${log.restore.ok ? "↺" : "✗"} restore — ${log.restore.detail}`);
    }

    log.passed = !log.error && log.restore.ok && log.assertions.length > 0 && log.assertions.every(assertion => assertion.ok);
    log.durationMs = Date.now() - start;
    runner.finish(log.passed);
    return log;
}

async function main(selection: Extract<Selection, { list: false }>): Promise<void> {
    const modified = await modifiedTrackedFiles();
    if (modified.length > 0) {
        console.error(`Commit or stash first — scenarios plant and restore tracked files. Modified: ${modified.join(", ")}`);
        process.exitCode = 1;
        return;
    }
    const startedAt = new Date();
    const run = startedAt.toISOString().replace(/[:.]/g, "-");
    const logs: ScenarioLog[] = [];
    let stoppedBy: string | undefined;

    for (const scenario of selection.scenarios) {
        const log = await runScenario(scenario, run, selection.maxTurns);
        logs.push(log);
        if (!log.restore.ok) {
            stoppedBy = `restore of ${scenario.id} failed (${log.restore.detail}); remaining scenarios not run`;
            break;
        }
    }

    const resultFile = path.join(EVALS_DIR, `${run}.json`);
    fs.mkdirSync(path.join(PROJECT_ROOT, EVALS_DIR), { recursive: true });
    fs.writeFileSync(
        path.join(PROJECT_ROOT, resultFile),
        JSON.stringify({ startedAt: startedAt.toISOString(), finishedAt: new Date().toISOString(), maxTurns: selection.maxTurns, stoppedBy, scenarios: logs }, null, 2) + "\n",
    );

    console.log("\nid            | passed | assertions | turns | cost");
    for (const log of logs) {
        const ok = log.assertions.filter(assertion => assertion.ok).length;
        console.log(`${log.id.padEnd(13)} | ${(log.passed ? "yes" : "NO").padEnd(6)} | ${`${ok}/${log.assertions.length}`.padEnd(10)} | ${String(log.claude?.turns ?? "-").padEnd(5)} | ${log.claude?.costUsd !== undefined ? `$${log.claude.costUsd.toFixed(2)}` : "-"}${log.error ? ` — ${log.error}` : ""}`);
    }
    if (stoppedBy) console.error(`STOPPED: ${stoppedBy}`);
    console.log(`Result: ${resultFile}`);
    if (stoppedBy || logs.some(log => !log.passed)) process.exitCode = 1;
}

if (isMainModule(import.meta.url)) {
    try {
        const selection = parseArgs(process.argv.slice(2));
        if (selection.list) printList();
        else void main(selection).catch(error => {
            console.error(error instanceof StageFailure || error instanceof Error ? error.message : error);
            process.exitCode = 1;
        });
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 2;
    }
}
