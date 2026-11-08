import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const PROJECT_ROOT = process.cwd();

export type Issue = { file: string; message: string };

export type MarkdownDoc = {
    title: string;
    // Body text before the first "## " heading (after the title)
    preamble: string;
    // "## Heading" → body, and "## Heading/### Sub" → body of that subsection
    sections: Map<string, string>;
};

export function readMarkdown(filePath: string): MarkdownDoc {
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    const sections = new Map<string, string>();
    const preamble: string[] = [];
    let title = "";
    let h2 = "";
    let h3 = "";
    let inFence = false;

    for (const line of lines) {
        if (line.trimStart().startsWith("```")) inFence = !inFence;
        const heading = inFence ? null : /^(#{1,3})\s+(.*?)\s*$/.exec(line);

        if (heading && heading[1] === "#" && !title) {
            title = heading[2];
            continue;
        }
        if (heading && heading[1] === "##") {
            h2 = heading[2];
            h3 = "";
            sections.set(h2, "");
            continue;
        }
        if (heading && heading[1] === "###" && h2) {
            h3 = heading[2];
            sections.set(`${h2}/${h3}`, "");
            continue;
        }

        if (!h2) {
            preamble.push(line);
            continue;
        }
        sections.set(h2, `${sections.get(h2)}${line}\n`);
        if (h3) sections.set(`${h2}/${h3}`, `${sections.get(`${h2}/${h3}`)}${line}\n`);
    }

    return { title, preamble: preamble.join("\n"), sections };
}

export function hasContent(body: string | undefined): boolean {
    return (body ?? "").trim().length > 0;
}

// Text with code spans and fenced blocks removed, so placeholders inside code are ignored
export function withoutCode(text: string): string {
    return text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

export function relative(filePath: string): string {
    return path.relative(PROJECT_ROOT, filePath);
}

export function isMainModule(moduleUrl: string): boolean {
    return process.argv[1] !== undefined && moduleUrl === pathToFileURL(path.resolve(process.argv[1])).href;
}

// Shared CLI: <script> <file> [--json] — prints issues and exits 1 when there are any
export function runCli(name: string, check: (filePath: string) => Issue[] | null): void {
    const args = process.argv.slice(2);
    const asJson = args.includes("--json");
    const fileArg = args.find(arg => !arg.startsWith("--"));

    if (!fileArg) {
        console.error(`Usage: yarn ${name} <file> [--json]`);
        process.exit(2);
    }

    const filePath = path.resolve(PROJECT_ROOT, fileArg);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${fileArg}`);
        process.exit(2);
    }

    const issues = check(filePath);
    const skipped = issues === null;
    const passed = skipped || issues.length === 0;

    if (asJson) {
        console.log(JSON.stringify({ file: relative(filePath), passed, skipped, issues: issues ?? [] }, null, 2));
    } else if (skipped) {
        console.log(`SKIPPED ${relative(filePath)} (not covered by ${name})`);
    } else if (passed) {
        console.log(`PASSED ${relative(filePath)}`);
    } else {
        console.log(`FAILED ${relative(filePath)} — ${issues.length} issue(s):`);
        for (const issue of issues) console.log(`  - [${issue.file}] ${issue.message}`);
    }

    process.exit(passed ? 0 : 1);
}
