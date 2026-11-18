---
name: revise-code
description: Revise the implemented code of a plan in implementation-plans/ after the OpenAI code review (Status Code Reviewed) or after the human sent the code back (Status Code Changes Requested), answering every finding or code review note, re-running the gates and tests, then hand it to the human. Use when asked to revise code, address code review findings, or rework an implementation.
allowed-tools: Read, Grep, Glob, Edit(models/**), Edit(test-flows/**), Edit(tests/web/**), Edit(test-data/**), Edit(constant/**), Edit(config/pages.json), Edit(implementation-plans/**), Bash(yarn tsc *), Bash(yarn harness:check-plan *), Bash(yarn harness:check-arch *), Bash(yarn harness:check-scope *), Bash(yarn harness:run-tests *), Bash(yarn playwright test --list *), Bash(git status *), Bash(git diff *), mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_fill_form, mcp__playwright__browser_select_option, mcp__playwright__browser_press_key, mcp__playwright__browser_hover, mcp__playwright__browser_wait_for, mcp__playwright__browser_navigate_back, mcp__playwright__browser_close
---

# Revise Implemented Code

Input: a plan path, e.g. `implementation-plans/REQ-001-remove-cart-items.md`.
Output: the revised code (uncommitted), `## Code Review Resolution` in the plan, `Status: Awaiting Human Code Review`.

This skill may run headless (`claude -p`). **Never stop to ask the user.** When you cannot proceed, record why and stop.

## 1. Gate
Read the plan's `Status:` line.
- `Code Reviewed` → section 3 (OpenAI findings).
- `Code Changes Requested` → section 4 (human notes).
- Anything else → stop and report.

## 2. Read the context
The plan (including Review Resolution and Implementation Notes), its requirement, `CLAUDE.md` (plus `.claude/rules/self-healing.md`
if the plan touches that area), the current change (`git diff HEAD`, `git status`) and the **current** content of every file a finding
or note refers to.

**Binding decisions:** the approved plan and its `→ A:` answers. If a finding contradicts them, reject the finding.

## 3. OpenAI findings (`Code Reviewed`)
Read `implementation-review/<plan-name>.code.json` (`findings[]` with `id`, `type`, `severity`, `file`, `problem`, `action`, `requirementIds`).
Verify each finding against the code and the rules before deciding — do not accept blindly, do not reject without evidence:
- **Accepted** — the finding is correct: change the code (see section 5). You may fix it differently from the suggested action if
  that fits the rules better; say so.
- **Rejected** — the finding is wrong, contradicts a rule, the plan or a human answer: give the evidence (file, line, rule).
- `VERIFICATION` findings: check them (test run, Playwright MCP snapshot) and accept or reject with the result.

## 4. Human notes (`Code Changes Requested`)
Under `## Human Code Review Notes`, every `- HC<n>: ...` without a matching resolution line is new feedback. Change the code for each
(section 5), or decline it only when it contradicts a rule or the plan — explain why. Do not revisit `C<n>` lines already resolved,
and do not run the OpenAI review again.

## 5. Change the code
Same rules as `/implement-plan` sections 3 and 6:
- CLAUDE.md layer rules, `withHealing()` for CSS/XPath, no CSS/XPath `Locator` getters, locators as class properties,
  `dynamic<Name>` templates, data through `TestDataProvider`, tags from `TAG`, specs import `test` from `tests/fixtures/base.ts`.
- Only files in the plan's Relevant Files. A fix needed outside them, in the self-healing pipeline, in `harness/` or in `.claude/`
  → do not make it; reject the finding / decline the note with that reason, or record `Blocked:` if the code cannot be accepted without it.
- No refactoring beyond the finding or note.

## 6. Gates and tests
If any code changed:
1. Run and fix until all pass: `yarn tsc --noEmit`, `yarn harness:check-arch`, `yarn harness:check-scope <plan>`,
   `yarn playwright test --list --config=playwright.config.web.js`.
2. Run the specs from the plan's *Verification* plus existing specs that use the changed code, **only** through
   `yarn harness:run-tests <spec...>` — **one call per round with all specs in it**.
3. On failure debug in the `/debug-failure` order, fix and rerun: at most **3 rounds** in total (the runner counts the
   `harness:run-tests` calls). Never bypass `withHealing()`, change an expected value to match wrong behaviour, add `waitForTimeout`
   or skip a test.
4. Update `## Implementation Notes`: `Tests:` cites the new `harness-results/tests/<timestamp>.json` (the last cited file must be the
   final run), `Gates:` the final results, and new `D<n>` deviations if any.

If no code changed, leave the gates and Implementation Notes as they are.

## 7. Code Review Resolution and status
Write `## Code Review Resolution` (before *Relevant Files*), keeping any lines already there. Start it with a reference to the review
file and its verdict, then one line per id:
- `- C<n> Accepted: <what changed in the code>` or `- C<n> Rejected: <why, with evidence>`
- `- HC<n> Done: <what changed>` or `- HC<n> Declined: <why>`

Write `## Commit Message` (before *Relevant Files*), or update it keeping any edits the human made: one fenced
```` ```text ```` block that `yarn agent:accept` commits verbatim (it adds the `Co-Authored-By` line itself — do not write it).
Subject `Implement REQ-<nnn>: <short title>`, at most 72 characters; blank line; `- ` bullets, wrapped at about 72 characters,
saying what changed and why, taken from the actual diff (not the plan prose); last line the code review verdict and the test
result. Keep it short, e.g.:

````
```text
Implement REQ-002: Check / Money Order guest checkout test

- OrderTestFlow.selectCheckMoneyOrderPaymentMethod(): asserts the
  Check / Money Order instruction, continues and waits for review.
- PaymentInformationComponent.paymentInstruction(), role-based;
  ConfirmOrderComponent.waitForConfirmStep() through withHealing().
- Instruction text in test-data/sit/checkout/PaymentInformationData.json.

OpenAI code review: APPROVE, 0 findings. 6 Day25 tests passed.
```
````

All gates and tests pass → set `Status: Awaiting Human Code Review` and run `yarn harness:check-plan <plan>`, fixing the plan until it passes.
Still failing after 3 rounds → keep the status, add `Blocked:` to Implementation Notes. Never commit and never revert files.

## 8. Report
Counts of Accepted / Rejected findings (or Done / Declined notes), the commit message, the files changed, gate and test results, and anything the human
should look at closely.
