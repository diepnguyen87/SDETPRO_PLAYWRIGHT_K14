import "dotenv/config";

import OpenAI from "openai";
import fs from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = process.cwd();

const PLAN_FILE = path.join(PROJECT_ROOT, "implementation-plan.md");
const CONTEXT_FILE = path.join(PROJECT_ROOT, "CLAUDE.md");
const REVIEW_OUTPUT_FILE = path.join(
    PROJECT_ROOT,
    "implementation-review",
    "openai-review.md"
);

const MAX_FILE_CHARS = 80_000;
const MAX_TOTAL_CONTEXT_CHARS = 300_000;

const client = new OpenAI({
    apiKey: process.env.OPEN_API_KEY,
});

function ensureEnvironment(): void {
    if (!process.env.OPEN_API_KEY) {
        throw new Error("OPEN_API_KEY is missing from .env");
    }

    if (!process.env.OPEN_MODEL) {
        throw new Error("OPEN_MODEL is missing from .env");
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

function extractRelevantFiles(planContent: string): string[] {
    const sectionMatch = planContent.match(
        /##\s+Relevant Files\s*\n([\s\S]*?)(?=\n##\s+|$)/i
    );

    if (!sectionMatch) {
        throw new Error(
            "The implementation plan does not contain a '## Relevant Files' section."
        );
    }

    const sectionContent = sectionMatch[1];

    const fileMatches = [
        ...sectionContent.matchAll(
            /^\s*[-*]\s+`([^`]+)`\s*$/gm
        ),
    ];

    const filePaths = fileMatches.map((match) => match[1].trim());

    const uniquePaths = [...new Set(filePaths)];

    for (const filePath of uniquePaths) {
        if (!isSafeProjectRelativePath(filePath)) {
            throw new Error(
                `Unsafe project-relative path detected: ${filePath}`
            );
        }
    }

    return uniquePaths;
}

async function collectProjectContext(): Promise<string> {
    const planContent = await readTextFile(PLAN_FILE, true);
    const claudeContent = await readTextFile(CONTEXT_FILE, true);

    if (!planContent || !claudeContent) {
        throw new Error("Required project context is missing.");
    }

    const relevantFiles = extractRelevantFiles(planContent);

    const contextParts: string[] = [];

    contextParts.push("===== FILE: CLAUDE.md =====\n");
    contextParts.push(claudeContent);

    contextParts.push("\n\n===== FILE: implementation-plan.md =====\n");
    contextParts.push(planContent);

    for (const relativeFilePath of relevantFiles) {
        const absoluteFilePath = path.resolve(
            PROJECT_ROOT,
            relativeFilePath
        );

        const fileContent = await readTextFile(absoluteFilePath);

        if (!fileContent) {
            contextParts.push(
                `\n\n===== FILE: ${relativeFilePath} =====\n`
            );
            contextParts.push(
                "[FILE COULD NOT BE READ OR DOES NOT EXIST]"
            );
            continue;
        }

        contextParts.push(
            `\n\n===== FILE: ${relativeFilePath} =====\n`
        );
        contextParts.push(fileContent);
    }

    let combinedContext = contextParts.join("");

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

Your responsibility is to review the implementation plan against the actual project
context and source code.

You are an independent reviewer. Do not blindly agree with the implementation plan.
Challenge assumptions and identify missing changes, incorrect dependencies, hidden risks,
and potential regressions.

Review the following areas:

1. Requirement coverage
   - Does the implementation plan satisfy the stated objective?
   - Is the checkout flow implemented in the correct order?
   - Is login correctly performed mid-flow on CheckoutAsGuestPage?

2. Architecture and layer responsibility
   - Are page objects, component objects, and test flows used correctly?
   - Does the proposed implementation respect the existing project architecture?
   - Is LoginComponent reused appropriately?
   - Is any business logic placed in the wrong layer?

3. TypeScript correctness
   - Are imports and file extensions consistent with the project?
   - Are constructors and method signatures compatible with existing classes?
   - Are return types and async operations correct?
   - Are there possible compile-time errors?

4. Playwright correctness
   - Are locators valid?
   - Is the redirect behavior handled correctly?
   - Are there timing or navigation risks after clicking Login?
   - Should the flow explicitly wait for a page state or URL?

5. Test data and environment handling
   - Are LOGIN_EMAIL and LOGIN_PASSWORD validated?
   - Could empty environment variables cause a misleading test failure?
   - Are secrets protected from logs and reports?

6. Regression risk
   - Could the new changes affect the existing guest checkout flow?
   - Does the proposed implementation accidentally duplicate or bypass existing logic?
   - Are reused components actually compatible with the new flow?

7. Self-healing compatibility
   - Does the change preserve the existing self-healing mechanism?
   - Are stable locators used appropriately?
   - Is any failure handling or locator behavior bypassed?

8. Test quality
   - Is the new test meaningful and maintainable?
   - Are assertions sufficient?
   - Does checkoutCompleted() actually verify successful completion?
   - Are negative or missing-credential cases relevant?

9. Missing implementation details
   - Identify any file that should be changed but is absent from Relevant Files.
   - Identify any file listed in Relevant Files that is unnecessary.
   - Identify assumptions that must be verified by running the test.

Return your review using this exact structure:

# Independent Code Review

## Overall Assessment

Choose exactly one:
- APPROVE
- APPROVE_WITH_CHANGES
- REJECT

Explain the decision briefly.

## Findings

For each finding, include:

### [SEVERITY] Finding title

- File:
- Problem:
- Why it matters:
- Recommended action:

Severity must be one of:
- CRITICAL
- HIGH
- MEDIUM
- LOW

## Missing Files or Dependencies

List any relevant files or dependencies that should be reviewed or modified.

## Validation Checklist

List concrete commands or checks that should be performed.

## Final Recommendation

Summarize whether the implementation should proceed as planned.
`;
}

async function runReview(): Promise<void> {
    ensureEnvironment();

    const projectContext = await collectProjectContext();
    const reviewInstructions = buildReviewInstructions();

    const response = await client.responses.create({
        model: process.env.OPEN_MODEL!,
        instructions: reviewInstructions,
        input: projectContext,
    });

    const reviewContent = response.output_text;

    if (!reviewContent || reviewContent.trim().length === 0) {
        throw new Error("The AI reviewer returned an empty response.");
    }

    await fs.mkdir(path.dirname(REVIEW_OUTPUT_FILE), {
        recursive: true,
    });

    await fs.writeFile(
        REVIEW_OUTPUT_FILE,
        reviewContent,
        "utf8"
    );

    console.log(
        `Review completed successfully: ${path.relative(
            PROJECT_ROOT,
            REVIEW_OUTPUT_FILE
        )}`
    );
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