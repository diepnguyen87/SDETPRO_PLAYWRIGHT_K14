// PreToolUse hook: keep secrets and the self-healing pipeline out of reach of an agent.
// - Read/Edit/Write on .env* or .auth/ → deny; Bash referencing them → deny
// - Edit/Write on self-healing pipeline files → ask (denied when running headless)
import { readFileSync } from "node:fs";
import path from "node:path";

const input = JSON.parse(readFileSync(0, "utf8"));
const tool = input.tool_name ?? "";
const toolInput = input.tool_input ?? {};
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();

const SECRET_PATH = /(^|\/)(\.env(\.[\w-]+)?|\.auth)(\/|$)/;
// A shell word naming a .env file or the .auth folder (process.env / dotenv do not match)
const SECRET_IN_COMMAND = /(^|[\s'"=<>|;&(/])(\.env(\.[\w-]+)?|\.auth)(?=$|[\s'"/;&|)<>])/;
const PIPELINE_PATH = /^(ai\/|models\/ai\/|tests\/fixtures\/|models\/components\/Component\.ts$|models\/pages\/BasePage\.ts$|models\/pages\/FailedLocatorManager\.ts$|config\/framework\.config\.ts$)/;

function decide(decision, reason) {
    process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: decision, permissionDecisionReason: reason },
    }));
    process.exit(0);
}

const filePath = toolInput.file_path ?? toolInput.notebook_path ?? toolInput.path ?? "";
const relativePath = filePath ? path.relative(projectDir, path.resolve(projectDir, filePath)) : "";

if (["Read", "Edit", "Write", "MultiEdit", "NotebookEdit"].includes(tool) && relativePath && SECRET_PATH.test(relativePath)) {
    decide("deny", `${relativePath} holds credentials or auth state; read configuration through process.env / config/environment.config.ts instead.`);
}

if (tool === "Bash" && SECRET_IN_COMMAND.test(toolInput.command ?? "")) {
    decide("deny", "Shell commands must not read or change .env* files or .auth/ (credentials).");
}

if (["Edit", "Write", "MultiEdit"].includes(tool) && relativePath && PIPELINE_PATH.test(relativePath)) {
    decide("ask", `${relativePath} is part of the AI self-healing pipeline (.claude/rules/self-healing.md); changes need explicit human approval.`);
}

process.exit(0);
