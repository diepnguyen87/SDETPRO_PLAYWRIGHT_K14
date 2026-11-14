---
name: implement-plan
description: Implement an Approved implementation plan in implementation-plans/ — write the code it describes, run the gates and its specs until they pass, record Implementation Notes and set Status Implemented. Use when asked to implement, build or code an approved plan.
allowed-tools: Read, Grep, Glob, Edit(models/**), Edit(test-flows/**), Edit(tests/web/**), Edit(test-data/**), Edit(constant/**), Edit(config/pages.json), Edit(implementation-plans/**), Bash(yarn tsc *), Bash(yarn harness:check-plan *), Bash(yarn harness:check-arch *), Bash(yarn harness:check-scope *), Bash(yarn harness:run-tests *), Bash(yarn playwright test --list *), Bash(git status *), Bash(git diff *), mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_fill_form, mcp__playwright__browser_select_option, mcp__playwright__browser_press_key, mcp__playwright__browser_hover, mcp__playwright__browser_wait_for, mcp__playwright__browser_navigate_back, mcp__playwright__browser_close
---

# Implement an Approved Plan

Input: a plan path, e.g. `implementation-plans/REQ-002-check-money-order-checkout.md`.
Output: the code the plan describes (uncommitted), `## Implementation Notes` in the plan, `Status: Implemented`.

This skill may run headless (`claude -p`). **Never stop to ask the user.** When you cannot proceed, record why and stop.

## 1. Gate
- `yarn harness:check-plan <plan>` passes and `Status: Approved`. Otherwise stop.
- `git status --porcelain` is empty (the human's approval is committed). Otherwise stop: the diff must contain only your work.

## 2. Read
The plan, its requirement, `CLAUDE.md` (plus `.claude/rules/self-healing.md` if the plan touches that area), and the **current**
content of every Relevant File. The plan may be older than the code (line numbers, renamed methods, steps already present);
follow the plan's intent against the current code.

## 3. Implement
Make exactly the changes under *Changes by Layer*, in this order: Component → Page Object → Test Data → TestFlow → Spec.
- Follow CLAUDE.md: layer rules, `withHealing()` for CSS/XPath, no CSS/XPath `Locator` getters, locators as class properties,
  `dynamic<Name>` templates, data through `TestDataProvider`, tags from `TAG`, specs import `test` from `tests/fixtures/base.ts`.
- New page → `/add-page` conventions (extends `BasePage`, registered in `config/pages.json`). New data → `/add-test-data`
  conventions (SIT only, registered in `sitData`).
- Do not add anything the plan does not ask for, and do not refactor surrounding code.
- After each edit the PostToolUse hook runs `tsc` and `arch-check` on the file; fix what it reports before moving on.

### Inspecting the real page (Playwright MCP)
Allowed when a locator or behaviour is unclear: navigate, snapshot, click, type, fill form, select option, press key, hover,
wait, go back. Prefer roles/labels from the snapshot (`getByRole` / `getByLabel`).
- Act as a guest only: never log in or register, never enter credentials.
- Enter data only from `test-data/` (e.g. the billing address data); never invent personal data.
- Close the browser when done.

## 4. Gates
Run and fix until all pass:
1. `yarn tsc --noEmit`
2. `yarn harness:check-arch`
3. `yarn harness:check-scope <plan>`
4. `yarn playwright test --list --config=playwright.config.web.js`

## 5. Tests
Run the specs from the plan's *Verification* plus existing specs that use the code you changed, **only** through
`yarn harness:run-tests <spec...> [--grep <title>]` (self-healing is disabled there, so failures are real).

If a test fails, investigate in the `/debug-failure` order — `artifacts/{browser}/{title}/` (screenshot, `dom.html`,
`metadata.json`), `logs/`, test data, the component action, the real page (MCP), configuration — fix the cause and rerun.
- At most **3 fix rounds** (a round = fix + `harness:run-tests`).
- Never bypass `withHealing()`, change an expected value to match wrong behaviour, add `waitForTimeout`, or skip a test.

## 6. Deviations and stop conditions
- A change that differs from the plan but stays within Relevant Files (e.g. the real locator differs from the plan's guess)
  is allowed: record it as `D<n>` in the notes.
- A change needed **outside Relevant Files**, in the self-healing pipeline, in `harness/` or in `.claude/` → do not make it.
  Stop and record it as `Blocked:`.

## 7. Implementation Notes and status
Add `## Implementation Notes` to the plan (before *Relevant Files*) with:
- `Deviations:` — `- D<n>: <what differs from the plan and why>` (or `- None`).
- `Gates:` — result of each gate.
- `Tests:` — each spec run, passed / failed, duration, and the `harness-results/tests/<timestamp>.json` path.
- `Blocked:` — only when stopping: the failure, the evidence and what was tried.

All gates and tests pass → set `Status: Implemented` and run `yarn harness:check-plan <plan>`.
Otherwise leave `Status: Approved`. Never commit and never revert files.

## 8. Report
Files changed, deviations, gate and test results, and anything the reviewer should look at closely.
