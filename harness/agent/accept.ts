// Harness runner for the end of stage 6: commits an Accepted plan's change on main (no push),
// with the plan's "## Commit Message" as the message.
//   yarn agent:accept implementation-plans/<plan>.md   (Status: Accepted, set by the human)
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT, readMarkdown } from "../checks/markdown.js";
import { commitMessageBlock } from "../checks/plan-check.js";
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

async function git(args: string[]): Promise<string> {
    const result = await runCommand("git", args);
    if (result.code !== 0) throw new StageFailure(`git ${args.join(" ")} failed: ${(result.stderr || result.stdout).trim()}`);
    return result.stdout;
}

// The plan's "## Commit Message" block (checked by check-plan), plus the trailer
function commitMessage(plan: string): string {
    const message = commitMessageBlock(readMarkdown(path.join(PROJECT_ROOT, plan)).sections.get("Commit Message"));
    if (message === null) throw new StageFailure(`${plan} has no "## Commit Message" \`\`\`text block`);
    return `${message}\n\n${CO_AUTHOR}`;
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

        await runner.stage("re-run the specs of the last cited test result", async () => {
            const cited = lastCitedTestResult(plan);
            const specs = [...new Set(cited.summary.tests.map(test => path.join(TEST_DIR, test.file)))].sort();
            if (specs.length === 0) throw new StageFailure(`${cited.file} lists no tests`);
            const before = testResultFiles();
            await runCommand("yarn", ["harness:run-tests", ...specs]);
            const file = resultFilesSince(before).pop();
            if (!file) throw new StageFailure("harness:run-tests wrote no result file");
            const summary: TestResultSummary = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, file), "utf8"));
            runner.log.testResults = [file];
            return { detail: assertTestsPassed(file, summary) };
        });

        await runner.stage(`commit on ${BRANCH}`, async () => {
            const scope = JSON.parse((await runCommand("yarn", ["harness:check-scope", plan, "--json"])).stdout);
            if (scope.outOfScope.length > 0) throw new StageFailure(`Changed outside Relevant Files: ${scope.outOfScope.join(", ")}`);
            // Review files of other plans are left alone
            const ownReview = `${REVIEW_DIR}/${path.basename(plan, ".md")}.`;
            const changed = (scope.changed as string[]).filter(file => !file.startsWith(`${REVIEW_DIR}/`) || file.startsWith(ownReview));
            if (changed.length === 0) throw new StageFailure("Nothing to commit");
            await git(["add", "--", ...changed]);
            await git(["commit", "-m", commitMessage(plan)]);
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
