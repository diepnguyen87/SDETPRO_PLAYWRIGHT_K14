// Removes the generated run outputs so the next run starts from clean inputs.
//   yarn harness:clean [--dry-run]
// Never touches harness-results/ (run evidence), .auth/, implementation-review/, *.bak / *.healing.lock next to the
// sources, or anything tracked by git.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT, isMainModule } from "../checks/markdown.js";

export const TARGETS = ["artifacts", "logs", "test-results", "playwright-report", "allure-results", "allure-report"];

export type CleanOutcome = { target: string; action: "removed" | "would remove" | "absent" | "skipped"; files: number; bytes: number; reason?: string };

function folderSize(folder: string): { files: number; bytes: number } {
    let files = 0;
    let bytes = 0;
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
        const full = path.join(folder, entry.name);
        if (entry.isDirectory()) {
            const inner = folderSize(full);
            files += inner.files;
            bytes += inner.bytes;
        } else {
            files++;
            bytes += fs.lstatSync(full).size;
        }
    }
    return { files, bytes };
}

function trackedByGit(root: string, target: string): boolean {
    try {
        return execFileSync("git", ["ls-files", "--", target], { cwd: root, encoding: "utf8" }).trim().length > 0;
    } catch {
        return false;
    }
}

export function cleanTarget(root: string, target: string, dryRun: boolean): CleanOutcome {
    const folder = path.join(root, target);
    if (isSymlink(folder)) return { target, action: "skipped", files: 0, bytes: 0, reason: "symlink" };
    if (!fs.existsSync(folder)) return { target, action: "absent", files: 0, bytes: 0 };
    if (!fs.lstatSync(folder).isDirectory()) return { target, action: "skipped", files: 0, bytes: 0, reason: "not a directory" };
    if (trackedByGit(root, target)) return { target, action: "skipped", files: 0, bytes: 0, reason: "tracked by git" };

    const { files, bytes } = folderSize(folder);
    if (!dryRun) fs.rmSync(folder, { recursive: true, force: true });
    return { target, action: dryRun ? "would remove" : "removed", files, bytes };
}

function isSymlink(folder: string): boolean {
    try {
        return fs.lstatSync(folder).isSymbolicLink();
    } catch {
        return false;
    }
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function main(): void {
    const args = process.argv.slice(2);
    const unknown = args.filter(arg => arg !== "--dry-run");
    if (unknown.length > 0) {
        console.error(`Unsupported argument ${unknown[0]}. Usage: yarn harness:clean [--dry-run]`);
        process.exit(2);
    }
    const dryRun = args.includes("--dry-run");

    const outcomes = TARGETS.map(target => cleanTarget(PROJECT_ROOT, target, dryRun));
    for (const outcome of outcomes) {
        const detail = outcome.action === "skipped" ? ` (${outcome.reason})` : outcome.action === "absent" ? "" : ` — ${outcome.files} files, ${formatBytes(outcome.bytes)}`;
        if (outcome.action === "skipped") console.warn(`  ! ${outcome.target}/ skipped${detail}`);
        else console.log(`  ${outcome.action} ${outcome.target}/${detail}`);
    }
    const cleaned = outcomes.filter(outcome => outcome.action === "removed" || outcome.action === "would remove");
    const total = cleaned.reduce((sum, outcome) => ({ files: sum.files + outcome.files, bytes: sum.bytes + outcome.bytes }), { files: 0, bytes: 0 });
    console.log(`${dryRun ? "DRY RUN harness:clean — would remove" : "harness:clean — removed"} ${cleaned.length} folder(s), ${total.files} files, ${formatBytes(total.bytes)}`);
}

if (isMainModule(import.meta.url)) main();
