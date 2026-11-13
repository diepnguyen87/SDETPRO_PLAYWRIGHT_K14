// Scope gate: every file changed vs HEAD must be planned.
//   yarn harness:check-scope implementation-plans/<plan>.md [--json]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT, isMainModule, readMarkdown, relative } from "./markdown.js";

const ALWAYS_ALLOWED_PREFIXES = ["implementation-review/"];

function git(args: string[]): string[] {
    return execFileSync("git", args, { cwd: PROJECT_ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
}

// Changed, added or deleted vs HEAD, including untracked (not ignored) files
export function changedPaths(): string[] {
    return [...new Set([...git(["diff", "--name-only", "HEAD"]), ...git(["ls-files", "--others", "--exclude-standard"])])].sort();
}

export function plannedPaths(planPath: string): Set<string> {
    const body = readMarkdown(planPath).sections.get("Relevant Files") ?? "";
    const paths = body
        .split("\n")
        .map(line => /^\s*[-*]\s+`?([^`\s]+)`?/.exec(line)?.[1])
        .filter((entry): entry is string => entry !== undefined);
    return new Set([...paths, relative(planPath)]);
}

export function outOfScope(planPath: string, changed: string[] = changedPaths()): string[] {
    const planned = plannedPaths(planPath);
    // An entry ending with "/" covers every file under that folder
    const plannedFolders = [...planned].filter(entry => entry.endsWith("/"));
    return changed.filter(file =>
        !planned.has(file) &&
        !plannedFolders.some(folder => file.startsWith(folder)) &&
        !ALWAYS_ALLOWED_PREFIXES.some(prefix => file.startsWith(prefix))
    );
}

function main(): void {
    const args = process.argv.slice(2);
    const planArg = args.find(arg => !arg.startsWith("--"));
    if (!planArg || !fs.existsSync(path.resolve(PROJECT_ROOT, planArg))) {
        console.error("Usage: yarn harness:check-scope implementation-plans/<plan>.md [--json]");
        process.exit(2);
    }

    const planPath = path.resolve(PROJECT_ROOT, planArg);
    const changed = changedPaths();
    const extra = outOfScope(planPath, changed);

    if (args.includes("--json")) {
        console.log(JSON.stringify({ plan: relative(planPath), changed, outOfScope: extra }, null, 2));
    } else if (extra.length === 0) {
        console.log(`PASSED scope-check — ${changed.length} changed file(s), all in ${relative(planPath)} Relevant Files`);
    } else {
        console.log(`FAILED scope-check — ${extra.length} file(s) changed outside ${relative(planPath)} Relevant Files:`);
        for (const file of extra) console.log(`  - ${file}`);
    }
    process.exit(extra.length === 0 ? 0 : 1);
}

if (isMainModule(import.meta.url)) main();
