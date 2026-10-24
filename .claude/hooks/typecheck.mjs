// PostToolUse hook: type-check the project after Claude edits a .ts file.
// Exit 2 feeds the tsc errors back to Claude; exit 0 stays silent.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const MAX_ERROR_LINES = 30;

const input = JSON.parse(readFileSync(0, "utf8"));
const filePath = input.tool_input?.file_path ?? "";
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
const relativePath = path.relative(projectDir, filePath);

const isProjectTsFile =
    filePath.endsWith(".ts") &&
    !relativePath.startsWith("..") &&
    !relativePath.startsWith("node_modules") &&
    !relativePath.startsWith("artifacts");

const tsc = path.join(projectDir, "node_modules", ".bin", "tsc");

if (!isProjectTsFile || !existsSync(tsc)) process.exit(0);

try {
    execFileSync(tsc, ["--noEmit", "-p", "tsconfig.json"], { cwd: projectDir, encoding: "utf8", stdio: "pipe" });
} catch (error) {
    const errorLines = `${error.stdout ?? ""}${error.stderr ?? ""}`
        .split("\n")
        .filter(line => line.includes("error TS"));
    if (errorLines.length === 0) process.exit(0);

    const shown = errorLines.slice(0, MAX_ERROR_LINES).join("\n");
    const more = errorLines.length > MAX_ERROR_LINES ? `\n... and ${errorLines.length - MAX_ERROR_LINES} more` : "";
    process.stderr.write(`tsc found ${errorLines.length} type error(s) after editing ${relativePath}:\n${shown}${more}\n`);
    process.exit(2);
}
