import path from "node:path";
import { Issue, hasContent, isMainModule, readMarkdown, relative, runCli, withoutCode } from "./markdown.js";

const REQUIRED_SECTIONS = [
    "Metadata",
    "Goal",
    "Scope/In Scope",
    "Scope/Out of Scope",
    "Preconditions",
    "User Flow",
    "Acceptance Criteria",
    "Expected Results",
];
const OPTIONAL_SECTIONS = ["Actors", "Error Cases", "Test Data", "Notes"];
const METADATA_FIELDS = ["ID", "Area", "Source", "Author"];
const SOURCES = ["manual", "copilot"];

const SECRET_PATTERNS: Array<[RegExp, string]> = [
    [/[\w.+-]+@[\w-]+\.[\w.-]+/, "an email address"],
    [/\b(?:\d[ -]?){13,19}\b/, "a card-like number"],
    [/\b(password|passwd|api[ _-]?key|secret|token)\s*[:=]\s*\S+/i, "a credential value"],
];

export type Requirement = {
    id: string;
    criteriaIds: string[];
    errorIds: string[];
};

function idsIn(body: string | undefined, pattern: RegExp): string[] {
    return [...(body ?? "").matchAll(pattern)].map(match => match[1]);
}

export function parseRequirement(filePath: string): Requirement {
    const doc = readMarkdown(filePath);
    return {
        id: /^(REQ-\d{3})\b/.exec(doc.title)?.[1] ?? "",
        criteriaIds: idsIn(doc.sections.get("Acceptance Criteria"), /^\s*-\s*\[[ xX]\]\s*(AC\d+):/gm),
        errorIds: idsIn(doc.sections.get("Error Cases"), /^\s*-\s*(E\d+):/gm),
    };
}

export function checkRequirement(filePath: string): Issue[] | null {
    const fileName = path.basename(filePath);
    if (fileName.startsWith("_")) return null;

    const file = relative(filePath);
    const issues: Issue[] = [];
    const add = (message: string) => issues.push({ file, message });

    const doc = readMarkdown(filePath);
    const fileId = /^(REQ-\d{3})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.exec(fileName)?.[1];
    const titleMatch = /^(REQ-\d{3}): \S/.exec(doc.title);

    if (!fileId) add(`File name must be REQ-<nnn>-<kebab-slug>.md, got "${fileName}"`);
    if (!titleMatch) add(`First line must be "# REQ-<nnn>: <Title>", got "# ${doc.title}"`);

    const metadata = doc.sections.get("Metadata") ?? "";
    const field = (name: string) => new RegExp(`^\\s*-\\s*${name}:\\s*(.*?)\\s*$`, "m").exec(metadata)?.[1];
    for (const name of METADATA_FIELDS) {
        if (!field(name)) add(`Metadata is missing "- ${name}: <value>"`);
    }
    const id = field("ID");
    if (id && !/^REQ-\d{3}$/.test(id)) add(`Metadata ID must be REQ-<nnn>, got "${id}"`);
    if (id && fileId && id !== fileId) add(`Metadata ID "${id}" does not match the file name id "${fileId}"`);
    if (id && titleMatch && id !== titleMatch[1]) add(`Metadata ID "${id}" does not match the title id "${titleMatch[1]}"`);
    const source = field("Source");
    if (source && !SOURCES.includes(source.toLowerCase())) add(`Metadata Source must be one of ${SOURCES.join(" | ")}, got "${source}"`);

    for (const section of REQUIRED_SECTIONS) {
        if (!doc.sections.has(section)) add(`Missing section "${section.replace("/", " › ")}"`);
        else if (!hasContent(doc.sections.get(section))) add(`Section "${section.replace("/", " › ")}" is empty`);
    }
    for (const section of OPTIONAL_SECTIONS) {
        if (!doc.sections.has(section)) add(`Missing section "${section}" (write "- None" if it does not apply)`);
    }

    const { criteriaIds, errorIds } = parseRequirement(filePath);
    if (doc.sections.has("Acceptance Criteria") && criteriaIds.length === 0) {
        add(`Acceptance Criteria must list items as "- [ ] AC<n>: ..."`);
    }
    const criteriaLines = (doc.sections.get("Acceptance Criteria") ?? "").split("\n").filter(line => /^\s*-\s/.test(line));
    if (criteriaLines.length > criteriaIds.length) add(`Every acceptance criterion needs an "AC<n>:" id (${criteriaLines.length - criteriaIds.length} without)`);
    const errorLines = (doc.sections.get("Error Cases") ?? "").split("\n").filter(line => /^\s*-\s/.test(line) && !/^\s*-\s*None\s*$/i.test(line));
    if (errorLines.length > errorIds.length) add(`Every error case needs an "E<n>:" id (${errorLines.length - errorIds.length} without)`);
    for (const ids of [criteriaIds, errorIds]) {
        const duplicates = ids.filter((value, index) => ids.indexOf(value) !== index);
        if (duplicates.length > 0) add(`Duplicate ids: ${[...new Set(duplicates)].join(", ")}`);
    }

    const content = withoutCode([...doc.sections.values()].join("\n"));
    const placeholders = content.match(/<[^<>\n]+>/g);
    if (placeholders) add(`Leftover placeholders: ${[...new Set(placeholders)].join(", ")}`);
    for (const [pattern, label] of SECRET_PATTERNS) {
        if (pattern.test(content)) add(`Must not contain ${label}`);
    }

    return issues;
}

if (isMainModule(import.meta.url)) {
    runCli("harness:check-req", checkRequirement);
}
