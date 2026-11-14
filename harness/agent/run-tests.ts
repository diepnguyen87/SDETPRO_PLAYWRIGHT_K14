// Agent test runner: the only way harness agents run specs.
//   yarn harness:run-tests <spec...> [--grep <title>]
// Always disables self-healing (SELF_HEALING_DISABLED=true) so failures surface instead of being patched,
// uses the web config and the Desktop Chromium project, and writes a machine-readable result.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "../checks/markdown.js";

const RESULTS_DIR = path.join(PROJECT_ROOT, "harness-results", "tests");
const PROJECT = "Desktop Chromium";

type TestResult = {
    title: string;
    file: string;
    status: string;
    durationMs: number;
    error?: string;
    attachments: string[];
};

type JsonReport = {
    suites?: JsonSuite[];
    errors?: Array<{ message?: string }>;
};
type JsonSuite = {
    title: string;
    file?: string;
    specs?: Array<{ title: string; file: string; tests: Array<{ projectName: string; results: Array<{ status: string; duration: number; error?: { message?: string }; attachments?: Array<{ path?: string }> }> }> }>;
    suites?: JsonSuite[];
};

function parseArgs(args: string[]): { specs: string[]; grep?: string } {
    const specs: string[] = [];
    let grep: string | undefined;
    for (let index = 0; index < args.length; index++) {
        if (args[index] === "--grep") {
            grep = args[++index];
        } else if (args[index].startsWith("--")) {
            throw new Error(`Unsupported option ${args[index]}: config, project and self-healing are fixed for agent runs`);
        } else {
            specs.push(args[index]);
        }
    }
    if (specs.length === 0) throw new Error("Usage: yarn harness:run-tests <spec...> [--grep <title>]");
    for (const spec of specs) {
        if (!spec.startsWith("tests/web/") || !fs.existsSync(path.join(PROJECT_ROOT, spec))) throw new Error(`Not a spec under tests/web/: ${spec}`);
    }
    return { specs, grep };
}

function collect(suite: JsonSuite, results: TestResult[]): void {
    for (const spec of suite.specs ?? []) {
        for (const test of spec.tests.filter(candidate => candidate.projectName === PROJECT)) {
            const last = test.results[test.results.length - 1];
            results.push({
                title: spec.title,
                file: suite.file ?? spec.file,
                status: last?.status ?? "skipped",
                durationMs: last?.duration ?? 0,
                // Strip ANSI colours so the error is readable in JSON
                error: last?.error?.message?.replace(/\u001b\[[0-9;]*m/g, "").slice(0, 2000),
                attachments: (last?.attachments ?? []).map(attachment => attachment.path).filter((p): p is string => !!p).map(p => path.relative(PROJECT_ROOT, p)),
            });
        }
    }
    for (const child of suite.suites ?? []) collect(child, results);
}

async function main(): Promise<void> {
    const { specs, grep } = parseArgs(process.argv.slice(2));
    const startedAt = new Date().toISOString();
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    const stamp = startedAt.replace(/[:.]/g, "-");
    const rawReport = path.join(RESULTS_DIR, `${stamp}.playwright.json`);
    const resultFile = path.join(RESULTS_DIR, `${stamp}.json`);

    const args = ["playwright", "test", ...specs, "--config=playwright.config.web.js", `--project=${PROJECT}`, "--reporter=list,json"];
    if (grep) args.push("--grep", grep);

    const code = await new Promise<number>((resolve, reject) => {
        const child = spawn("yarn", args, {
            cwd: PROJECT_ROOT,
            stdio: ["ignore", "inherit", "inherit"],
            env: { ...process.env, SELF_HEALING_DISABLED: "true", PLAYWRIGHT_JSON_OUTPUT_NAME: rawReport },
        });
        child.on("error", reject);
        child.on("close", exit => resolve(exit ?? 1));
    });

    const report: JsonReport = fs.existsSync(rawReport) ? JSON.parse(fs.readFileSync(rawReport, "utf8")) : {};
    const tests: TestResult[] = [];
    for (const suite of report.suites ?? []) collect(suite, tests);

    const summary = {
        startedAt,
        finishedAt: new Date().toISOString(),
        command: `SELF_HEALING_DISABLED=true yarn ${args.join(" ")}`,
        exitCode: code,
        passed: tests.filter(test => test.status === "passed" || test.status === "expected").length,
        failed: tests.filter(test => ["failed", "timedOut", "interrupted", "unexpected"].includes(test.status)).length,
        skipped: tests.filter(test => test.status === "skipped").length,
        globalErrors: (report.errors ?? []).map(error => error.message?.replace(/\u001b\[[0-9;]*m/g, "") ?? ""),
        tests,
    };
    fs.writeFileSync(resultFile, JSON.stringify(summary, null, 2) + "\n");
    fs.rmSync(rawReport, { force: true });

    console.log(`\nharness:run-tests — ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped (self-healing disabled)`);
    for (const test of tests.filter(candidate => candidate.status !== "passed")) {
        console.log(`  ✗ ${test.title} [${test.status}] ${test.error?.split("\n")[0] ?? ""}`);
    }
    console.log(`  result: ${path.relative(PROJECT_ROOT, resultFile)}`);
    process.exitCode = code;
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 2;
});
