# Implementation Plan: Playwright MCP Server for Claude Code

## Objective

Make the project-pinned Playwright MCP server (`@playwright/mcp` 0.0.83, devDependency) available
to Claude Code in this repo, so Claude can open real pages of the app under test and read their
accessibility tree (roles / labels) when writing locators — as already described in `CLAUDE.md`
→ *Claude Code Tooling*.

No framework, test, Page Object or Component code changes.

---

## Current State (verified)

| Item | State |
|---|---|
| `@playwright/mcp` | `0.0.83` in `devDependencies`; binary at `node_modules/.bin/playwright-mcp` (`yarn playwright-mcp --version` → `0.0.83`) |
| `package.json` script | `"mcp:playwright": "playwright-mcp"` |
| VS Code | `.vscode/mcp.json` runs `npx --no-install playwright-mcp` (tracked, commit `456a5f2`) |
| `.claude/settings.local.json` | `enabledMcpjsonServers: ["playwright"]` — already approves the server |
| `.gitignore` | `.playwright-mcp` (MCP output dir) already ignored |
| **`.mcp.json`** | **Missing.** Added in `fad553b`, deleted in `beaec25` (Yarn 4 upgrade) |
| `claude mcp list` | Only `claude.ai Claude Docs` — no `playwright` server |

### Root cause

The old `.mcp.json` ran `yarn -s playwright-mcp --isolated`. Yarn 4 (Berry) has no `-s` flag:

```
$ yarn -s playwright-mcp --version
Unknown Syntax Error: Command not found; ...
$ yarn playwright-mcp --version
Version 0.0.83
```

So the server could not start after the upgrade and the file was removed instead of fixed.
`CLAUDE.md` still documents the server, so docs and config are out of sync.

---

## Changes

### 1. NEW — `.mcp.json` (project scope, committed)

```json
{
  "mcpServers": {
    "playwright": {
      "command": "yarn",
      "args": ["playwright-mcp", "--isolated", "--output-dir", ".playwright-mcp"]
    }
  }
}
```

Decisions:
- **`yarn`, not `npx`** — matches `d31b8c1` (Claude Code uses Yarn). Yarn 4 prints no banner on
  `yarn <bin>`, so stdout stays clean JSON-RPC for the stdio transport.
- **Local binary, no `@latest`** — runs the pinned 0.0.83, same version as VS Code.
- **`--isolated`** — in-memory browser profile; no cookies / login state leak between sessions
  or into `.auth/`.
- **`--output-dir .playwright-mcp`** — snapshots / console logs land in the already-ignored folder.
- Headed by default (useful locally to watch the browser). Not used in CI, so no `--headless`.

### 2. No change — `.claude/settings.local.json`

`enabledMcpjsonServers: ["playwright"]` already exists, so the server starts without an approval
prompt on this machine. Other clones get the one-time "approve project MCP server" prompt — this
is intended; approval stays per-user (the file is git-ignored).

### 3. OPTIONAL — `.claude/settings.json` permissions

To avoid a prompt on every read-only browser call, allow the inspection tools only:

```json
"mcp__playwright__browser_navigate",
"mcp__playwright__browser_snapshot",
"mcp__playwright__browser_close"
```

Interactive tools (`browser_click`, `browser_type`, `browser_fill_form`, …) keep prompting.
→ **Needs your decision** (keep prompts vs. allow the three above).

### 4. UPDATE — `CLAUDE.md` → *Claude Code Tooling* → MCP line

Keep it accurate and add the usage rule:

```
- MCP: `playwright` server in `.mcp.json` (runs the `@playwright/mcp` devDependency via
  `yarn playwright-mcp --isolated`; same binary as `yarn mcp:playwright` and `.vscode/mcp.json`).
  Use it only to inspect real pages (accessibility snapshot) for roles/labels when writing
  locators — never as a substitute for running the tests, and never to log in with real
  credentials from `.env.*`.
```

---

## Out of Scope

- No changes to `package.json`, dependency versions, `.vscode/mcp.json`, `.gitignore`.
- MCP is not added to CI, Docker, `HealingEngine`, fixtures or `ai/review.ts`.
- No new tests (config-only change).

---

## Verification

1. `yarn playwright-mcp --version` → `Version 0.0.83`.
2. `claude mcp list` → `playwright: yarn playwright-mcp --isolated ... - ✔ Connected`.
3. Restart Claude Code in the repo, run `/mcp` → `playwright` connected, tools listed
   (`browser_navigate`, `browser_snapshot`, …).
4. Smoke check: ask Claude to navigate to `envConfig.baseURL` (SIT) and take a snapshot →
   accessibility tree returned; files appear only under `.playwright-mcp/`.
5. `git status` → only `.mcp.json` and `CLAUDE.md` (and `.claude/settings.json` if step 3 is
   accepted) changed.

---

## Relevant Files

- `.mcp.json` (new)
- `CLAUDE.md`
- `.claude/settings.json` (optional)
- `.claude/settings.local.json` (read only)
- `.vscode/mcp.json` (read only)
- `package.json` (read only)
