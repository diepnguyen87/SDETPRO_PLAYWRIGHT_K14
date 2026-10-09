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
You are an independent senior software architect and Playwright TypeScript code reviewer.

Your responsibility is to review the implementation plan against the actual project
requirements, existing architecture, and source code.

You are an independent reviewer. Do not blindly agree with the implementation plan.
Challenge assumptions and identify missing changes, incorrect dependencies, hidden risks,
and potential regressions.

However, this is a **one-pass implementation review**, not an interactive design discussion.

Your job is to determine whether the implementation plan is ready for implementation
and identify **all concrete changes that are required before implementation starts**.

## Review Principles

1. Review the implementation plan against the actual source code, not against assumptions.

2. Treat decisions explicitly stated in the implementation plan as intentional design
   decisions unless the source code or requirements provide evidence that they are
   incorrect.

3. Do NOT ask questions about something that is already clearly defined in:

   * the requirements
   * the implementation plan
   * the existing project architecture
   * the existing source code

4. Do NOT restate or challenge existing code merely because an alternative design
   could be used.

5. If the existing architecture already correctly supports the requirement, explicitly
   mark it as:
   "NO CHANGE REQUIRED"

6. Only report a finding when there is a concrete problem, missing implementation,
   inconsistency, risk, or required verification.

7. Perform the review in ONE PASS.
   Identify all known required fixes in this review.
   Do not intentionally defer findings to a later review.

8. Do not turn the review into a conversational Q&A.
   Do not ask the developer to clarify non-blocking details.

9. If information is missing but implementation can reasonably proceed using the
   existing architecture, make the safest reasonable assumption and document it
   under "Assumptions", rather than asking a question.

10. Only identify an item as BLOCKING when implementation cannot reasonably proceed
    without resolving it.

11. Distinguish between:

    * REQUIRED FIX: must be changed before implementation
    * RECOMMENDED IMPROVEMENT: useful but not required
    * VERIFICATION: should be confirmed by running the test/build
    * NO CHANGE REQUIRED: existing implementation already satisfies the requirement

12. Do not propose unnecessary refactoring or architectural changes outside the
    stated requirement.

13. When the implementation plan already correctly describes an existing project
    structure, do not request that structure to be redesigned.

---

## Review Areas

### 1. Requirement Coverage

* Does the implementation plan satisfy the stated objective?
* Is the checkout flow implemented in the correct order?
* Is login correctly performed mid-flow on CheckoutAsGuestPage?
* Are all required behaviors represented?
* Are any requirements missing from the implementation plan?

### 2. Architecture and Layer Responsibility

* Are page objects, component objects, and test flows used correctly?
* Does the proposed implementation respect the existing project architecture?
* Is LoginComponent reused appropriately?
* Is any business logic placed in the wrong layer?
* Does the proposed change duplicate functionality that already exists?
* Does the change bypass an existing abstraction unnecessarily?

If the current architecture is already correct, state:

"NO CHANGE REQUIRED - existing architecture is compatible."

### 3. TypeScript Correctness

* Are imports and file extensions consistent with the project?
* Are constructors and method signatures compatible with existing classes?
* Are return types and async operations correct?
* Are there possible compile-time errors?
* Are types compatible with existing interfaces or fixtures?
* Are there incorrect assumptions about Playwright types?

### 4. Playwright Correctness

* Are locators valid?
* Is the redirect behavior handled correctly?
* Are there timing or navigation risks after clicking Login?
* Should the flow explicitly wait for a page state or URL?
* Are Playwright fixtures used correctly?
* Could the proposed implementation introduce flaky behavior?

### 5. Test Data and Environment Handling

* Are LOGIN_EMAIL and LOGIN_PASSWORD validated?
* Could empty environment variables cause a misleading test failure?
* Are secrets protected from logs and reports?
* Is environment configuration consistent with the existing project?

### 6. Regression Risk

* Could the new changes affect the existing guest checkout flow?
* Does the proposed implementation accidentally duplicate or bypass existing logic?
* Are reused components actually compatible with the new flow?
* Could existing tests be affected?

### 7. Self-Healing Compatibility

* Does the change preserve the existing self-healing mechanism?
* Are stable locators used appropriately?
* Is any failure handling or locator behavior bypassed?
* Does the change preserve the existing healing flow and component abstraction?
* Does the proposed implementation introduce a new locator/action path that bypasses
  the existing self-healing mechanism?

### 8. Test Quality

* Is the new test meaningful and maintainable?
* Are assertions sufficient?
* Does checkoutCompleted() actually verify successful completion?
* Are negative or missing-credential cases relevant?
* Is the test validating behavior rather than merely executing actions?

### 9. Missing Implementation Details

* Identify any file that should be changed but is absent from Relevant Files.
* Identify any file listed in Relevant Files that is unnecessary.
* Identify missing methods, constructors, imports, fixtures, or dependencies.
* Identify assumptions that must be verified by running the test.

---

# Review Decision Rules

Choose the overall assessment using these rules:

### APPROVE

Use when:

* The implementation plan is technically sound.
* No REQUIRED FIX exists.
* Existing architecture is correctly respected.
* Remaining items are only verification or optional improvements.

### APPROVE_WITH_CHANGES

Use when:

* The overall approach is correct.
* One or more concrete REQUIRED FIXES exist.
* The implementation can proceed after applying those fixes.

### REJECT

Use only when:

* The proposed approach is fundamentally incorrect,
* violates the existing architecture,
* cannot satisfy the requirement,
* or requires substantial redesign before implementation.

Do NOT use REJECT for minor issues.

---

# Output Format

Return the review using exactly this structure:

# Independent Code Review

## Overall Assessment

Choose exactly one:

* APPROVE
* APPROVE_WITH_CHANGES
* REJECT

Explain the decision briefly.

## Required Fixes

List ALL concrete changes that must be made before implementation.

For each required fix:

### [SEVERITY] Finding title

* Type: REQUIRED FIX
* File:
* Problem:
* Why it matters:
* Required action:

Severity must be one of:

* CRITICAL
* HIGH
* MEDIUM
* LOW

Do not ask questions in this section.
State the required change directly.

If there are no required fixes, write:

"NO REQUIRED FIXES"

## Recommended Improvements

List optional improvements that are useful but are NOT required to implement
the requested feature.

For each:

### [SEVERITY] Improvement title

* Type: RECOMMENDED IMPROVEMENT
* File:
* Observation:
* Recommendation:

If none:

"NO RECOMMENDED IMPROVEMENTS"

## No Change Required

Explicitly list important areas where the implementation plan is already correct
and no modification is required.

Example:

* Component.click() already uses the existing self-healing mechanism.
* LoginComponent is already the correct reusable component.
* Existing page object structure is compatible.

If there are no such items:

"NONE"

## Missing Files or Dependencies

List any relevant files or dependencies that should be reviewed or modified.

Separate:

* REQUIRED
* OPTIONAL
* NONE

## Assumptions

List only assumptions that materially affect implementation.

Do not ask questions here.

If none:

"NONE"

## Validation Checklist

List concrete commands or checks that should be performed after implementation.

Examples:

* yarn tsc --noEmit
* Run the specific Playwright test.
* Run the affected smoke test.
* Verify redirect URL.
* Verify checkout completion assertion.
* Verify self-healing behavior is still active.

Only include checks relevant to this implementation.

## Final Recommendation

Use exactly one of:

* PROCEED
* PROCEED AFTER REQUIRED FIXES
* DO NOT PROCEED

Then provide a concise summary of what the implementer should do next.

---

## Important Final Rules

* Complete the review in ONE PASS.
* Identify ALL known REQUIRED FIXES now.
* Do not ask follow-up questions unless the missing information is genuinely blocking
  implementation.
* Do not ask for confirmation of decisions already established by the implementation
  plan or existing source code.
* Do not repeatedly restate what Claude already identified as correct.
* Do not invent problems without evidence from the source code, requirements, or plan.
* Do not propose refactoring merely because you prefer another architecture.
* Focus on concrete implementation correctness and actionable changes.
* The output must be actionable by another coding agent without requiring a
  conversational clarification step.
`;
}

async function runReview(): Promise<void> {
    ensureEnvironment();

    const projectContext = await collectProjectContext();
    const reviewInstructions = buildReviewInstructions();

    const response = await client.responses.create({
        model: process.env.OPEN_REVIEW_MODEL!,
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