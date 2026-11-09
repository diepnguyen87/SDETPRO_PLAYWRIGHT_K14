import "dotenv/config";

import OpenAI from "openai";
import fs from "node:fs/promises";
import path from "node:path";
import { PLAN_REVIEW_JSON_SCHEMA, PlanReview, renderPlanReviewMarkdown } from "./ReviewSchema.js";

const PROJECT_ROOT = process.cwd();

// yarn ai:review implementation-plans/<topic>.md [--mode plan] [--dry-run]
const ARGS = process.argv.slice(2);
const PLAN_ARG = ARGS.find(arg => !arg.startsWith("--") && ARGS[ARGS.indexOf(arg) - 1] !== "--mode");
const MODE = ARGS.includes("--mode") ? ARGS[ARGS.indexOf("--mode") + 1] : "plan";
const DRY_RUN = ARGS.includes("--dry-run");

const PLAN_FILE = PLAN_ARG ? path.resolve(PROJECT_ROOT, PLAN_ARG) : "";
const CONTEXT_FILE = path.join(PROJECT_ROOT, "CLAUDE.md");
const REVIEW_OUTPUT_DIR = path.join(PROJECT_ROOT, "implementation-review");

const MAX_FILE_CHARS = 80_000;
const MAX_TOTAL_CONTEXT_CHARS = 300_000;

// Rule files sent when a Relevant File falls under their scope
const RULE_FILES: Array<{ file: string; scope: RegExp }> = [
    {
        file: ".claude/rules/self-healing.md",
        scope: /^(ai\/|models\/ai\/|tests\/fixtures\/|models\/components\/Component\.ts$|models\/pages\/BasePage\.ts$|models\/pages\/FailedLocatorManager\.ts$|config\/framework\.config\.ts$)/,
    },
    {
        file: ".claude/rules/github-actions.md",
        scope: /^(\.github\/workflows\/|Dockerfile$|docker-compose\.yml$|\.dockerignore$)/,
    },
];

type RelevantFile = { path: string; isNew: boolean };

type ContextFile = { label: string; path: string; content: string };

function ensureEnvironment(): void {
    if (!process.env.OPEN_API_KEY) {
        throw new Error("OPEN_API_KEY is missing from .env");
    }

    if (!process.env.OPEN_REVIEW_MODEL) {
        throw new Error("OPEN_REVIEW_MODEL is missing from .env");
    }
}

async function readTextFile(
    filePath: string,
    required = false
): Promise<string | null> {
    try {
        const content = await fs.readFile(filePath, "utf8");

        if (content.length > MAX_FILE_CHARS) {
            return (
                content.slice(0, MAX_FILE_CHARS) +
                "\n\n[TRUNCATED: file exceeded maximum allowed size]"
            );
        }

        return content;
    } catch (error) {
        if (required) {
            throw new Error(`Cannot read required file: ${filePath}`);
        }

        console.warn(`Warning: file not found or unreadable: ${filePath}`);
        return null;
    }
}

function isSafeProjectRelativePath(filePath: string): boolean {
    if (path.isAbsolute(filePath)) {
        return false;
    }

    const resolvedPath = path.resolve(PROJECT_ROOT, filePath);
    const relativePath = path.relative(PROJECT_ROOT, resolvedPath);

    return (
        relativePath !== "" &&
        !relativePath.startsWith("..") &&
        !path.isAbsolute(relativePath)
    );
}

// Accepts "- path", "- `path`" and either form followed by "(new)"
function extractRelevantFiles(planContent: string): RelevantFile[] {
    const sectionMatch = planContent.match(
        /##\s+Relevant Files\s*\n([\s\S]*?)(?=\n##\s+|$)/i
    );

    if (!sectionMatch) {
        throw new Error(
            "The implementation plan does not contain a '## Relevant Files' section."
        );
    }

    const entries = [
        ...sectionMatch[1].matchAll(
            /^\s*[-*]\s+`?([^`\s]+)`?\s*(\(new\))?\s*$/gm
        ),
    ].map((match) => ({ path: match[1].trim(), isNew: match[2] !== undefined }));

    const uniqueEntries = entries.filter(
        (entry, index) => entries.findIndex((other) => other.path === entry.path) === index
    );

    for (const entry of uniqueEntries) {
        if (!isSafeProjectRelativePath(entry.path)) {
            throw new Error(
                `Unsafe project-relative path detected: ${entry.path}`
            );
        }
    }

    return uniqueEntries;
}

function extractRequirementPath(planContent: string): string | null {
    const requirement = planContent.match(/^Requirement:\s*(\S+)\s*$/m)?.[1];

    if (requirement && !isSafeProjectRelativePath(requirement)) {
        throw new Error(`Unsafe requirement path: ${requirement}`);
    }

    return requirement ?? null;
}

async function collectContextFiles(): Promise<ContextFile[]> {
    if (!PLAN_FILE) {
        throw new Error("Missing plan file. Usage: yarn ai:review implementation-plans/<topic>.md [--mode plan] [--dry-run]");
    }

    const planContent = (await readTextFile(PLAN_FILE, true))!;
    const claudeContent = (await readTextFile(CONTEXT_FILE, true))!;
    const relevantFiles = extractRelevantFiles(planContent);
    const requirementPath = extractRequirementPath(planContent);
    const planRelativePath = path.relative(PROJECT_ROOT, PLAN_FILE);

    const files: ContextFile[] = [{ label: "PROJECT RULES", path: "CLAUDE.md", content: claudeContent }];

    for (const rule of RULE_FILES) {
        if (!relevantFiles.some((entry) => rule.scope.test(entry.path))) continue;
        const content = await readTextFile(path.join(PROJECT_ROOT, rule.file), true);
        files.push({ label: "PROJECT RULES", path: rule.file, content: content! });
    }

    if (requirementPath) {
        const content = await readTextFile(path.join(PROJECT_ROOT, requirementPath), true);
        files.push({ label: "REQUIREMENT", path: requirementPath, content: content! });
    }

    files.push({ label: "IMPLEMENTATION PLAN UNDER REVIEW", path: planRelativePath, content: planContent });

    for (const entry of relevantFiles) {
        if (entry.path === requirementPath || entry.path === "CLAUDE.md") continue;

        if (entry.isNew) {
            files.push({ label: "NEW FILE", path: entry.path, content: "[NEW FILE — created by this plan; it does not exist yet]" });
            continue;
        }

        const content = await readTextFile(path.resolve(PROJECT_ROOT, entry.path));
        files.push({
            label: "SOURCE",
            path: entry.path,
            content: content ?? "[FILE COULD NOT BE READ OR DOES NOT EXIST]",
        });
    }

    return files;
}

function buildProjectContext(files: ContextFile[]): string {
    let combinedContext = files
        .map((file) => `===== ${file.label}: ${file.path} =====\n${file.content}`)
        .join("\n\n");

    if (combinedContext.length > MAX_TOTAL_CONTEXT_CHARS) {
        combinedContext =
            combinedContext.slice(0, MAX_TOTAL_CONTEXT_CHARS) +
            "\n\n[TRUNCATED: total project context exceeded maximum size]";
    }

    return combinedContext;
}

function buildReviewInstructions(): string {
    return `
You are an independent senior software architect and Playwright TypeScript reviewer.

You review an implementation plan for a Playwright + TypeScript test automation project
against its requirement, the project rules (CLAUDE.md and any rule files provided) and the
actual source code provided. The plan was written by another AI agent (Claude); the plan will
be revised from your findings and then reviewed by a human before any code is written.

This is a ONE-PASS review, not a conversation. Report every concrete issue now.

## Inputs

* PROJECT RULES — binding architecture and coding rules.
* REQUIREMENT — acceptance criteria (AC<n>) and error cases (E<n>). May be absent for older plans.
* IMPLEMENTATION PLAN UNDER REVIEW — follows the project plan template.
* SOURCE — current content of files the plan reads or changes.
* NEW FILE — files the plan will create; they do not exist yet. Do not report them as missing.

## Review Principles

1. Review against the provided source code, not assumptions. Do not invent problems without
   evidence from the requirement, the rules, the plan or the source.
2. Answers written under "Open Questions" as "→ A: ..." are decisions made by the human.
   Treat them as binding. Check that the plan body is consistent with them; never challenge them.
3. Decisions stated explicitly in the plan are intentional unless the source or the rules show
   they are wrong.
4. Do not propose refactoring or redesign outside the requirement, and do not ask to redesign
   existing structure the plan describes correctly.
5. Do not ask questions. If information is missing but implementation can reasonably proceed,
   make the safest assumption and list it under "assumptions".
6. Classify every finding:
   * REQUIRED_FIX — the plan must change before implementation (wrong, missing or rule-violating).
   * RECOMMENDED — useful but not required.
   * VERIFICATION — something that can only be confirmed by running the code or the app.
7. Severity: CRITICAL (cannot work / breaks the framework), HIGH (requirement not met or rule violated),
   MEDIUM (likely bug or flakiness), LOW (minor).

## Review Areas

1. Requirement coverage — every AC<n> and E<n> has a Traceability row, the planned test and
   assertion actually prove it, and "Not automated" reasons are valid.
2. Architecture and layers — Spec → TestFlow → Page Object → Component responsibilities as defined
   in the rules; no raw Playwright API where the rules forbid it; global component accessors not duplicated.
3. Reuse and existence — every class, method, property and file the plan cites as existing really exists
   in the provided source with that name and signature; no duplication of existing functionality.
4. TypeScript correctness — imports with .js extensions, constructor and method signatures,
   async/await, return types, compile errors.
5. Playwright correctness — locator priority and validity, waits and navigation (no waitForTimeout as a
   substitute), web-first assertions, flakiness risks, route/interception usage if any.
6. Self-healing compatibility — CSS/XPath interactions through withHealing(); no new path that bypasses it;
   locators as class properties; dynamic<Name> templates for runtime values.
7. Test data and environment — data through TestDataProvider, nothing hardcoded that belongs in test data
   or env, no secrets.
8. Test independence and regression — each test starts from a known state; changes to shared code do
   not break existing specs listed in Relevant Files.
9. Plan completeness — files that must change but are missing from Relevant Files, unnecessary entries,
   Verification commands that would actually prove the change.

## Decision Rules

* APPROVE — no REQUIRED_FIX.
* APPROVE_WITH_CHANGES — the approach is right but at least one REQUIRED_FIX exists.
* REJECT — the approach is fundamentally wrong or violates the architecture; not for minor issues.

## Output

Return JSON matching the provided schema:
* findings: ids F1, F2, ... in order, most severe first; "file" is the project-relative path the finding
  is about (use the plan path for plan-only issues); "action" states the concrete change to the plan;
  "requirementIds" lists the affected AC<n>/E<n> (empty if none).
* summary: two to four sentences on the overall assessment.
* validationChecklist: concrete commands or checks to run after implementation, relevant to this plan only.
`;
}

async function runReview(): Promise<void> {
    if (MODE !== "plan") {
        throw new Error(`--mode ${MODE} is not supported yet (code review comes with harness Slice B). Use --mode plan.`);
    }

    const contextFiles = await collectContextFiles();
    const projectContext = buildProjectContext(contextFiles);
    const planName = path.basename(PLAN_FILE, ".md");
    const jsonOutput = path.join(REVIEW_OUTPUT_DIR, `${planName}.plan.json`);
    const markdownOutput = path.join(REVIEW_OUTPUT_DIR, `${planName}.plan.md`);

    if (DRY_RUN) {
        console.log(`Dry run — context for ${path.relative(PROJECT_ROOT, PLAN_FILE)} (${projectContext.length} chars):`);
        for (const file of contextFiles) {
            console.log(`  [${file.label}] ${file.path} (${file.content.length} chars)`);
        }
        console.log(`Would write: ${path.relative(PROJECT_ROOT, jsonOutput)}, ${path.relative(PROJECT_ROOT, markdownOutput)}`);
        return;
    }

    ensureEnvironment();

    const client = new OpenAI({
        apiKey: process.env.OPEN_API_KEY,
    });
    const model = process.env.OPEN_REVIEW_MODEL!;

    const response = await client.responses.create({
        model,
        instructions: buildReviewInstructions(),
        input: projectContext,
        text: {
            format: {
                type: "json_schema",
                name: "plan_review",
                strict: true,
                schema: PLAN_REVIEW_JSON_SCHEMA as unknown as Record<string, unknown>,
            },
        },
    });

    const reviewContent = response.output_text;

    if (!reviewContent || reviewContent.trim().length === 0) {
        throw new Error("The AI reviewer returned an empty response.");
    }

    const review: PlanReview = JSON.parse(reviewContent);
    const planRelativePath = path.relative(PROJECT_ROOT, PLAN_FILE);

    await fs.mkdir(REVIEW_OUTPUT_DIR, { recursive: true });
    await fs.writeFile(jsonOutput, JSON.stringify(review, null, 2) + "\n", "utf8");
    await fs.writeFile(markdownOutput, renderPlanReviewMarkdown(review, planRelativePath, model), "utf8");

    const counts = ["REQUIRED_FIX", "RECOMMENDED", "VERIFICATION"]
        .map((type) => `${type} ${review.findings.filter((finding) => finding.type === type).length}`)
        .join(", ");
    console.log(`Review completed: ${review.verdict} (${counts})`);
    console.log(`  ${path.relative(PROJECT_ROOT, jsonOutput)}`);
    console.log(`  ${path.relative(PROJECT_ROOT, markdownOutput)}`);
}

runReview().catch((error: unknown) => {
    console.error("AI review failed.");

    if (error instanceof Error) {
        console.error(error.message);
    } else {
        console.error(error);
    }

    process.exitCode = 1;
});
