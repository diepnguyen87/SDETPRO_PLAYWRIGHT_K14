// Harness runner for the end of stage 6: commits an Accepted plan's change on main (no push).
//   yarn agent:accept implementation-plans/<plan>.md   (Status: Accepted, set by the human)
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "../checks/markdown.js";
import {
    REVIEW_DIR,
    Runner,
    StageFailure,
    TestResultSummary,
    assertTestsPassed,
    lastCitedTestResult,
    resultFilesSince,
    runCommand,
    testResultFiles,
} from "./runner.js";

const RUN_LOG_DIR = path.join("harness-results", "agent-accept");
const BRANCH = "main";
const TEST_DIR = "tests/web";
const CO_AUTHOR = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";

// Commit message layers, in the order of the plan's Changes by Layer
const LAYERS: Array<{ name: string; folder: RegExp }> = [
    { name: "Spec", folder: /^tests\// },
    { name: "TestFlow", folder: /^test-flows\// },
    { name: "Page Object", folder: /^models\/pages\// },
    { name: "Component", folder: /^models\/components\// },
    { name: "Test Data", folder: /^test-data\// },
    { name: "Config", folder: /^config\// },
];

async function git(args: string[]): Promise<string> {
    const result = await runCommand("git", args);
    if (result.code !== 0) throw new StageFailure(`git ${args.join(" ")} failed: ${(result.stderr || result.stdout).trim()}`);
    return result.stdout;
}

function reviewSummary(plan: string, kind: "plan" | "code"): string {
    const file = path.join(PROJECT_ROOT, REVIEW_DIR, `${path.basename(plan, ".md")}.${kind}.json`);
    if (!fs.existsSync(file)) return "not run";
    const review = JSON.parse(fs.readFileSync(file, "utf8"));
    return `${review.verdict}, ${review.findings.length} finding(s)`;
}

// Public methods declared on added lines of the staged diff of one file
async function addedPublicMethods(file: string): Promise<string[]> {
    const diff = await git(["diff", "--cached", "-U0", "--", file]);
    const names = [...diff.matchAll(/^\+(?!\+\+)\s*public\s+(?:static\s+)?(?:async\s+)?(\w+)\s*[(<]/gm)].map(match => `${match[1]}()`);
    return [...new Set(names)];
}

async function changesByLayer(files: string[]): Promise<string[]> {
    const added = new Set((await git(["diff", "--cached", "--name-status", "--diff-filter=A"])).split("\n").map(line => line.split("\t")[1]).filter(Boolean));
    const groups = new Map<string, string[]>();
    for (const file of files) {
        const layer = LAYERS.find(candidate => candidate.folder.test(file))?.name ?? "Other";
        const methods = await addedPublicMethods(file);
        const entry = `${file}${added.has(file) ? " (new)" : ""}${methods.length > 0 ? ` — ${methods.join(", ")}` : ""}`;
        groups.set(layer, [...(groups.get(layer) ?? []), entry]);
    }
    return [...LAYERS.map(layer => layer.name), "Other"]
        .filter(layer => groups.has(layer))
        .map(layer => `- ${layer}: ${groups.get(layer)!.join("; ")}`);
}

async function commitMessage(plan: string, codeFiles: string[], testFile: string, tests: TestResultSummary): Promise<string> {
    const content = fs.readFileSync(path.join(PROJECT_ROOT, plan), "utf8");
    const title = /^#\s+(?:Implementation Plan:\s*)?(.+)$/m.exec(content)?.[1].trim() ?? path.basename(plan, ".md");
    const requirement = /^Requirement:\s*(\S+)/m.exec(content)?.[1];
    const reqId = /^(REQ-\d+)/.exec(path.basename(plan))?.[1];

    return [
        `Implement ${reqId ? `${reqId}: ` : ""}${title}`,
        "",
        ...(requirement ? [`Requirement: ${requirement}`, ""] : []),
        "Changes:",
        ...(await changesByLayer(codeFiles)),
        "",
        `Plan review: ${reviewSummary(plan, "plan")}. Code review: ${reviewSummary(plan, "code")}.`,
        `Tests: ${tests.passed}/${tests.tests.length} passed (${testFile}, self-healing disabled).`,
        "",
        CO_AUTHOR,
    ].join("\n");
}

async function accept(plan: string): Promise<void> {
    const runner = new Runner(RUN_LOG_DIR, "accept", plan, plan, async () => [], "n/a");
    try {
        await runner.stage("check-plan", () => runner.check("harness:check-plan", plan));
        await runner.stage("status is Accepted", async () => runner.expectStatus(plan, "Accepted"));
        await runner.stage(`branch is ${BRANCH}`, async () => {
            const branch = (await git(["rev-parse", "--abbrev-ref", "HEAD"])).trim();
            if (branch !== BRANCH) throw new StageFailure(`On "${branch}"; agent:accept commits on ${BRANCH} only`);
        });
        await runner.gates(plan);

        let fresh = { file: "", summary: {} as TestResultSummary };
        await runner.stage("re-run the specs of the last cited test result", async () => {
            const cited = lastCitedTestResult(plan);
            const specs = [...new Set(cited.summary.tests.map(test => path.join(TEST_DIR, test.file)))].sort();
            if (specs.length === 0) throw new StageFailure(`${cited.file} lists no tests`);
            const before = testResultFiles();
            await runCommand("yarn", ["harness:run-tests", ...specs]);
            const file = resultFilesSince(before).pop();
            if (!file) throw new StageFailure("harness:run-tests wrote no result file");
            fresh = { file, summary: JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, file), "utf8")) };
            runner.log.testResults = [file];
            return { detail: assertTestsPassed(file, fresh.summary) };
        });

        await runner.stage(`commit on ${BRANCH}`, async () => {
            const scope = JSON.parse((await runCommand("yarn", ["harness:check-scope", plan, "--json"])).stdout);
            if (scope.outOfScope.length > 0) throw new StageFailure(`Changed outside Relevant Files: ${scope.outOfScope.join(", ")}`);
            // Review files of other plans are left alone
            const ownReview = `${REVIEW_DIR}/${path.basename(plan, ".md")}.`;
            const changed = (scope.changed as string[]).filter(file => !file.startsWith(`${REVIEW_DIR}/`) || file.startsWith(ownReview));
            if (changed.length === 0) throw new StageFailure("Nothing to commit");
            await git(["add", "--", ...changed]);
            const codeFiles = changed.filter(file => file !== plan && !file.startsWith(`${REVIEW_DIR}/`));
            await git(["commit", "-m", await commitMessage(plan, codeFiles, fresh.file, fresh.summary)]);
            runner.log.commit = (await git(["rev-parse", "--short", "HEAD"])).trim();
            return { detail: `${runner.log.commit} — ${changed.length} file(s), not pushed` };
        });
        runner.finish(true);
    } catch {
        runner.finish(false);
        process.exitCode = 1;
    }
}

const target = process.argv.slice(2).find(arg => !arg.startsWith("--"));

if (!target || !fs.existsSync(path.resolve(PROJECT_ROOT, target))) {
    console.error("Usage: yarn agent:accept implementation-plans/<plan>.md");
    process.exitCode = 2;
} else {
    void accept(path.relative(PROJECT_ROOT, path.resolve(PROJECT_ROOT, target)));
}
