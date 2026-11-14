# Implementation Plan: Harness B2 — `/implement-plan` Skill

Part of `implementation-plans/harness-b-implement.md` (Slice B, stage 4).

## Objective

Claude implements an `Approved` plan within its approved scope, runs the gates and the tests until they pass, records
`## Implementation Notes` and sets `Status: Implemented`. Invoked with `claude -p` in B2; the runner comes in B4.

## Decisions (2026-11-14)

| Topic | Decision |
|---|---|
| Fix rounds | At most 3 debug → fix → rerun rounds in the skill (unrelated to `maxHealingRetries`, which `SELF_HEALING_DISABLED` never reaches); the B4 runner enforces it by counting `harness:run-tests` calls |
| Still failing after 3 rounds | Status stays `Approved`, Implementation Notes get a `Blocked:` entry, nothing committed or reverted |
| Playwright MCP | Interactive tools allowed in this stage (navigate, snapshot, click, type, fill_form, select_option, press_key, hover, wait_for, navigate_back, close); not `browser_evaluate`, `browser_run_code_unsafe`, `browser_file_upload`. Guest only, no login/registration, inputs from `test-data/` |
| MCP origins | `.mcp.json` passes `--allowed-origins` for the SIT base URL |
| Clean tree | The human's `Approved` edit is committed before implementation, so `git diff HEAD` holds only the agent's code |

---

## 1. `yarn harness:run-tests <spec...>` — `harness/agent/run-tests.ts`

Sets `SELF_HEALING_DISABLED=true`, `--config=playwright.config.web.js`, `--project="Desktop Chromium"`, adds a JSON reporter;
writes `harness-results/tests/<timestamp>.json` (per test: title, file, status, duration, error, attachments) and prints a summary.
Exit code = Playwright's.

## 2. `.claude/skills/implement-plan/SKILL.md`

Gate (`check-plan`, `Approved`, clean tree) → read plan, requirement, rules and the current code of every Relevant File →
implement Changes by Layer (Component → Page → Test Data → Flow → Spec, `/add-page` / `/add-test-data` conventions) →
gates (`check-arch`, `check-scope`, `--list`) → `harness:run-tests` (plan specs + affected existing specs) → on failure debug per
`/debug-failure`, max 3 rounds, never bypass `withHealing()` / change expected values / add `waitForTimeout` → deviations inside
Relevant Files recorded as `D<n>`; anything outside Relevant Files or in the self-healing pipeline → stop → Implementation Notes →
`Implemented` (or `Blocked:` and stay `Approved`).

## 3. Template and plan-check

Optional `## Implementation Notes` in the template; from `Implemented` on it must be non-empty.

## 4. Documentation

`CLAUDE.md`: `/implement-plan`, `yarn harness:run-tests`, MCP section updated for the implement stage. `package.json`: script.

---

## Verification

1. Typecheck clean; `harness:run-tests` on a Day25 spec writes a correct JSON and logs that self-healing is disabled.
2. No-cost negatives: plan not `Approved` / dirty tree → the skill stops.
3. Real run: `claude -p "/implement-plan implementation-plans/REQ-002-check-money-order-checkout.md"` → gates pass, new spec and
   existing COD / Credit Card tests pass, `Status: Implemented` with notes; diff reviewed against the `code-reviewer` checklist.
4. Code left uncommitted as input for B3.

## Relevant Files

- harness/agent/run-tests.ts (new)
- .claude/skills/implement-plan/SKILL.md (new)
- implementation-plans/_TEMPLATE.md
- harness/checks/plan-check.ts
- .mcp.json
- package.json
- CLAUDE.md
- implementation-plans/harness-b-implement.md
- playwright.config.web.js
- config/environment.config.ts
