---
name: write-plan
description: Turn a requirement in requirements/REQ-<nnn>-<slug>.md into an implementation plan in implementation-plans/ following the plan template, without editing code. Use when asked to analyse a requirement or write/propose an implementation plan for it.
allowed-tools: Read, Grep, Glob, Edit(implementation-plans/**), Bash(yarn harness:check-req *), Bash(yarn harness:check-plan *), Bash(git log:*), mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_close
---

# Write an Implementation Plan from a Requirement

Input: a requirement path, e.g. `requirements/REQ-001-remove-cart-items.md`.
Output: `implementation-plans/REQ-<nnn>-<slug>.md` (same base name as the requirement), `Status: Draft`.

This skill may run headless (`claude -p`). **Never stop to ask the user.** Record anything you cannot decide from the requirement or the code as an Open Question.

## 1. Gate the input
Run `yarn harness:check-req <requirement>`. If it fails, stop: report the issues and write no plan.
If the plan file already exists and its `Status` is not `Draft` or `Changes Requested`, stop and report — never overwrite a reviewed plan.

## 2. Read the rules
Read `CLAUDE.md`. If the requirement touches the self-healing pipeline or CI, also read `.claude/rules/self-healing.md` or `.claude/rules/github-actions.md`.

## 3. Reuse before creating
For every `AC<n>` and `E<n>`:
- Find the existing spec, TestFlow, Page Object, Component and test data that already cover it (`tests/web/`, `test-flows/`, `models/pages/`, `models/components/`, `test-data/TestDataProvider.ts`, `config/pages.json`). Global components (header, footer, notification) are exposed by `BasePage`.
- **Grep every class and method you cite** and use its real name and signature. Never cite a method that does not exist as if it did; a method the plan creates goes under *Changes by Layer* as new.
- Prefer extending an existing flow/page/component over a new one.

## 4. Check the real page (optional)
Only with the Playwright MCP, only `browser_navigate` + `browser_snapshot` on pages reachable without interaction (no clicks, no login, no credentials), then `browser_close`. For states that need interaction (e.g. a filled cart), rely on the existing components or on `artifacts/**/dom.html`.

## 5. Design
- Layer order: Spec → TestFlow → Page Object → Component. Specs only `page.goto()`, call flow steps and assert; flows call page objects only; CSS/XPath interactions go through `withHealing()`.
- Locator priority: getByRole > getByLabel > getByPlaceholder > getByTestId > CSS > XPath; class-property locators; `dynamic<Name>` templates for runtime values.
- Never plan a getter that returns a CSS/XPath `Locator` (`foo(): Locator`), not even "for assertions only". Plan a wait/read method through `withHealing()` (e.g. `waitForConfirmStep()` → `l => l.waitFor()`, `getRowCount()` → `l => l.count()`) and assert on its result, with `expect.poll()` when it needs retrying. Only `getByRole()` / `getByLabel()` locators may be exposed for web-first assertions.
- New page → `config/pages.json`; new data → `test-data/sit/**/<Name>Data.json` + `test-data/TestDataProvider.ts`; tags from `TAG`; specs import `test` from `tests/fixtures/base.ts`.
- Tests are independent: say how each test starts from a known state (e.g. empty cart).
- Every AC/E gets a web-first assertion, or `Not automated: <reason>` in Traceability.
- Scope: Day25 and the shared code (header, footer, cart, checkout). Do not plan refactors outside the requirement.

## 6. Write the plan
Copy `implementation-plans/_TEMPLATE.md` to `implementation-plans/REQ-<nnn>-<slug>.md` and fill it:
- `Status: Draft`, `Requirement: requirements/REQ-<nnn>-<slug>.md`.
- One Traceability row per `AC<n>` / `E<n>`.
- *Reuse* lists what is used unchanged; *Changes by Layer* lists every new or changed class/method with its file.
- *Verification* gives the exact commands (typecheck, `--list`, the specs to run, project).
- Leave *Review Resolution* empty. Remove the template's HTML comment and all `<placeholder>` text.
- *Open Questions*: `- Q<n>: ...` for each unknown (answers `→ A: ...` are added by the human). Write `- None` if there are none.
- *Relevant Files*: every file read for the design or changed, new files marked `(new)`.

Write **only** this plan file. Do not edit code, test data, config or other plans.

## 7. Validate
Run `yarn harness:check-plan <plan>` and fix the plan until it passes.

## 8. Report
Plan path, number of ids traced to a test vs `Not automated`, and the Open Questions.
