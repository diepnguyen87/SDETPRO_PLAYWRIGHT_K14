import fs from "node:fs";
import path from "node:path";
import { Issue, PROJECT_ROOT, hasContent, isMainModule, readMarkdown, relative, withoutCode, runCli } from "./markdown.js";
import { checkRequirement, parseRequirement } from "./requirement-check.js";

export const STATUSES = [
    "Draft",
    "Plan Reviewed",
    "Awaiting Human Review",
    "Changes Requested",
    "Approved",
    "Implemented",
    "Code Reviewed",
    "Awaiting Human Code Review",
    "Accepted",
] as const;

// From this status on, the OpenAI findings must have been answered
const REVIEW_RESOLVED_FROM = STATUSES.indexOf("Awaiting Human Review");
// From this status on, every open question must have been answered by the human
const QUESTIONS_ANSWERED_FROM = STATUSES.indexOf("Approved");
const IMPLEMENTED_FROM = STATUSES.indexOf("Implemented");

const REQUIRED_SECTIONS = [
    "Objective",
    "Acceptance Criteria Traceability",
    "Scenarios",
    "Reuse",
    "Changes by Layer",
    "Out of Scope",
    "Risks",
    "Verification",
    "Review Resolution",
    "Relevant Files",
];

// Where a new file of each kind must live
const NEW_FILE_RULES: Array<{ kind: RegExp; location: RegExp; expected: string }> = [
    { kind: /Page\.ts$/, location: /^models\/pages\/\w+Page\.ts$/, expected: "models/pages/<Name>Page.ts" },
    { kind: /Component\.ts$/, location: /^models\/components\/(?:[\w-]+\/)*\w+Component\.ts$/, expected: "models/components/**/<Name>Component.ts" },
    { kind: /TestFlow\.ts$/, location: /^test-flows\/(?:[\w-]+\/)*\w+TestFlow\.ts$/, expected: "test-flows/**/<Name>TestFlow.ts" },
    { kind: /\.spec\.ts$/, location: /^tests\/web\/(?:[\w-]+\/)*\w+\.spec\.ts$/, expected: "tests/web/**/<Name>.spec.ts" },
    { kind: /^test-data\/.*\.json$/, location: /^test-data\/sit\/(?:[\w-]+\/)*\w+Data\.json$/, expected: "test-data/sit/**/<Name>Data.json" },
];

type RelevantFile = { path: string; isNew: boolean };

function parseRelevantFiles(body: string): RelevantFile[] {
    return body
        .split("\n")
        .map(line => /^\s*-\s+`?([^`\s]+)`?\s*(\(new\))?\s*$/.exec(line))
        .filter((match): match is RegExpExecArray => match !== null)
        .map(match => ({ path: match[1], isNew: match[2] !== undefined }));
}

function traceabilityIds(body: string): Map<string, string> {
    const rows = new Map<string, string>();
    for (const line of body.split("\n")) {
        const cells = line.split("|").map(cell => cell.trim());
        // | ID | Covered by | Assertion | → ["", ID, Covered by, Assertion, ""]
        if (cells.length < 4 || !/^(AC|E)\d+$/.test(cells[1])) continue;
        rows.set(cells[1], cells[2]);
    }
    return rows;
}

function idsOf(body: string, pattern: RegExp): string[] {
    return [...body.matchAll(pattern)].map(match => match[1]);
}

// "- Q1: ..." is answered by a later "→ A: ..." line before the next question
function unansweredQuestions(body: string): string[] {
    const unanswered: string[] = [];
    let current: string | null = null;
    for (const line of body.split("\n")) {
        const question = /^\s*-\s*(Q\d+):/.exec(line);
        if (question) {
            if (current) unanswered.push(current);
            current = question[1];
        } else if (current && /^\s*(?:-\s*)?(?:→|->)\s*A:\s*\S/.test(line)) {
            current = null;
        }
    }
    if (current) unanswered.push(current);
    return unanswered;
}

export function checkPlan(filePath: string): Issue[] | null {
    if (path.basename(filePath).startsWith("_")) return null;

    const doc = readMarkdown(filePath);
    const requirementLine = /^Requirement:\s*(.+?)\s*$/m.exec(doc.preamble);
    const status = /^Status:\s*(.+?)\s*$/m.exec(doc.preamble)?.[1];
    // Plans written before the requirement contract have neither line
    if (!requirementLine && !status) return null;

    const file = relative(filePath);
    const issues: Issue[] = [];
    const add = (message: string) => issues.push({ file, message });

    if (!status) add(`Missing "Status: <value>" line under the title`);
    else if (!(STATUSES as readonly string[]).includes(status)) add(`Invalid Status "${status}"; expected one of: ${STATUSES.join(", ")}`);

    const requirementPath = requirementLine ? path.resolve(PROJECT_ROOT, requirementLine[1]) : "";
    let requirementIds: string[] = [];
    if (!requirementLine) {
        add(`Missing "Requirement: requirements/REQ-<nnn>-<slug>.md" line under the title`);
    } else if (!fs.existsSync(requirementPath)) {
        add(`Requirement file not found: ${requirementLine[1]}`);
    } else {
        const requirementIssues = checkRequirement(requirementPath) ?? [];
        issues.push(...requirementIssues);
        const requirement = parseRequirement(requirementPath);
        requirementIds = [...requirement.criteriaIds, ...requirement.errorIds];
    }

    for (const section of REQUIRED_SECTIONS) {
        if (!doc.sections.has(section)) add(`Missing section "${section}"`);
    }
    for (const section of ["Objective", "Acceptance Criteria Traceability", "Scenarios", "Verification", "Relevant Files"]) {
        if (doc.sections.has(section) && !hasContent(doc.sections.get(section))) add(`Section "${section}" is empty`);
    }

    const placeholders = withoutCode([...doc.sections.values()].join("\n")).match(/<[^<>\n!]+>/g);
    if (placeholders) add(`Leftover placeholders: ${[...new Set(placeholders)].join(", ")}`);

    const traced = traceabilityIds(doc.sections.get("Acceptance Criteria Traceability") ?? "");
    const missing = requirementIds.filter(id => !traced.has(id));
    if (missing.length > 0) add(`Traceability is missing requirement ids: ${missing.join(", ")}`);
    const unknown = [...traced.keys()].filter(id => requirementIds.length > 0 && !requirementIds.includes(id));
    if (unknown.length > 0) add(`Traceability lists ids not in the requirement: ${unknown.join(", ")}`);
    for (const [id, coveredBy] of traced) {
        if (!coveredBy || coveredBy === "—" || coveredBy === "-") add(`Traceability row ${id} has no coverage; write a spec › step or "Not automated: <reason>"`);
        else if (/^Not automated\s*:?\s*$/i.test(coveredBy)) add(`Traceability row ${id} says "Not automated" without a reason`);
    }

    const relevantFiles = parseRelevantFiles(doc.sections.get("Relevant Files") ?? "");
    if (doc.sections.has("Relevant Files") && relevantFiles.length === 0) add(`Relevant Files must list paths as "- path" or "- path (new)"`);
    for (const entry of relevantFiles) {
        const exists = fs.existsSync(path.resolve(PROJECT_ROOT, entry.path));
        if (!entry.isNew && !exists) add(`Relevant file does not exist (mark it "(new)" if the plan creates it): ${entry.path}`);
        if (!entry.isNew) continue;
        // Once implementation has started, new files are expected to exist
        if (exists && status !== undefined && STATUSES.indexOf(status as typeof STATUSES[number]) < STATUSES.indexOf("Implemented")) {
            add(`File marked "(new)" already exists: ${entry.path}`);
        }
        const rule = NEW_FILE_RULES.find(candidate => candidate.kind.test(entry.path));
        if (rule && !rule.location.test(entry.path)) add(`New file ${entry.path} must follow ${rule.expected}`);
    }

    const newPaths = relevantFiles.filter(entry => entry.isNew).map(entry => entry.path);
    const listed = (target: string) => relevantFiles.some(entry => entry.path === target);
    if (newPaths.some(p => /^models\/pages\/.*Page\.ts$/.test(p)) && !listed("config/pages.json")) {
        add(`A new page requires config/pages.json in Relevant Files`);
    }
    if (newPaths.some(p => /^test-data\/sit\/.*\.json$/.test(p)) && !listed("test-data/TestDataProvider.ts")) {
        add(`New test data requires test-data/TestDataProvider.ts in Relevant Files`);
    }

    const statusIndex = STATUSES.indexOf(status as typeof STATUSES[number]);
    if (statusIndex >= REVIEW_RESOLVED_FROM && status !== "Changes Requested" && !hasContent(doc.sections.get("Review Resolution"))) {
        add(`Status "${status}" requires a filled "Review Resolution" section`);
    }

    // Every OpenAI finding (yarn ai:review output) must be answered by id in Review Resolution
    const reviewJson = path.join(PROJECT_ROOT, "implementation-review", `${path.basename(filePath, ".md")}.plan.json`);
    if (statusIndex >= REVIEW_RESOLVED_FROM && status !== "Changes Requested" && fs.existsSync(reviewJson)) {
        const findingIds: string[] = (JSON.parse(fs.readFileSync(reviewJson, "utf8")).findings ?? []).map((finding: { id: string }) => finding.id);
        const resolution = doc.sections.get("Review Resolution") ?? "";
        const unresolved = findingIds.filter(id => !new RegExp(`^\\s*-\\s*${id}\\s+(Accepted|Rejected)\\b`, "m").test(resolution));
        if (unresolved.length > 0) add(`Review Resolution must answer each finding of ${relative(reviewJson)} as "- F<n> Accepted|Rejected: ...": missing ${unresolved.join(", ")}`);
    }

    // Every human review note must be answered once the plan is handed back to the human
    if (statusIndex >= REVIEW_RESOLVED_FROM && status !== "Changes Requested") {
        const noteIds = idsOf(doc.sections.get("Human Review Notes") ?? "", /^\s*-\s*(H\d+):/gm);
        const resolution = doc.sections.get("Review Resolution") ?? "";
        const unresolvedNotes = noteIds.filter(id => !new RegExp(`^\\s*-\\s*${id}\\s+(Done|Declined)\\b`, "m").test(resolution));
        if (unresolvedNotes.length > 0) add(`Review Resolution must answer each human note as "- H<n> Done|Declined: ...": missing ${unresolvedNotes.join(", ")}`);
    }

    // Once implemented, the implementer must have recorded what it did and how it was tested
    if (statusIndex >= IMPLEMENTED_FROM) {
        const notes = doc.sections.get("Implementation Notes") ?? "";
        if (!hasContent(notes)) add(`Status "${status}" requires a filled "Implementation Notes" section`);
        else if (!/Tests:/i.test(notes)) add(`Implementation Notes must include a "Tests:" entry with the test results`);
    }

    if (statusIndex >= QUESTIONS_ANSWERED_FROM) {
        const unanswered = unansweredQuestions(doc.sections.get("Open Questions") ?? "");
        if (unanswered.length > 0) add(`Status "${status}" requires an "→ A:" answer for: ${unanswered.join(", ")}`);
    }

    return issues;
}

if (isMainModule(import.meta.url)) {
    runCli("harness:check-plan", checkPlan);
}
