---
name: revise-plan
description: Revise an implementation plan in implementation-plans/ after the OpenAI plan review (Status Plan Reviewed) or after the human sent it back (Status Changes Requested), answering every finding or review note, then hand it to the human. Use when asked to revise, address review findings for, or rework an implementation plan.
allowed-tools: Read, Grep, Glob, Edit(implementation-plans/**), Bash(yarn harness:check-plan *)
---

# Revise an Implementation Plan

Input: a plan path, e.g. `implementation-plans/REQ-001-remove-cart-items.md`.
Output: the same file, revised, with `Status: Awaiting Human Review`.

This skill may run headless (`claude -p`). **Never stop to ask the user.** Edit only the plan file.

## 1. Gate
Read the plan's `Status:` line.
- `Plan Reviewed` → section 3 (OpenAI findings).
- `Changes Requested` → section 4 (human notes).
- Anything else → stop and report; never touch an `Approved` or later plan.

## 2. Read the context
The plan, its requirement (`Requirement:` line), `CLAUDE.md` (plus `.claude/rules/self-healing.md` or `github-actions.md` if the plan touches those areas), and every source file a finding or note refers to.

**Binding decisions:** answers under *Open Questions* written as `→ A: ...` are the human's decisions. Never reverse them. If a finding contradicts one, reject the finding.

## 3. OpenAI findings (`Plan Reviewed`)
Read `implementation-review/<plan-name>.plan.json` (`findings[]` with `id`, `type`, `severity`, `file`, `problem`, `action`, `requirementIds`).
For each finding, verify it against the source code and the rules before deciding — do not accept blindly, do not reject without evidence:
- **Accepted** — the finding is correct: change the plan body where it applies (Traceability, Scenarios, Changes by Layer, Risks, Verification, Relevant Files). You may implement the intent differently from the suggested action if that fits the rules better; say so.
- **Rejected** — the finding is wrong, contradicts a rule, the code or a human answer: give the evidence (file, rule, line).

Write one line per finding under `## Review Resolution`, keeping any lines already there:
`- F<n> Accepted: <what changed in the plan>` or `- F<n> Rejected: <why, with evidence>`.
Start the section with a reference to the review file and its verdict.

## 4. Human notes (`Changes Requested`)
Under `## Human Review Notes`, every `- H<n>: ...` without a matching resolution line is new feedback. Also apply any new `→ A:` answers under *Open Questions*.
For each note change the plan body, then add under `## Review Resolution`:
`- H<n> Done: <what changed>` or `- H<n> Declined: <why — only when the note contradicts a rule or the code; explain>`.
Do not revisit `F<n>` lines already resolved, and do not run the OpenAI review again.

## 5. Keep the plan consistent
After the changes, re-read the whole plan: Traceability rows, scenario count, Verification commands, Risks and Relevant Files (`(new)` markers) must agree with each other. Remove anything made obsolete.

## 6. Validate and hand over
Set `Status: Awaiting Human Review`, run `yarn harness:check-plan <plan>` and fix the plan until it passes.

## 7. Report
Counts of Accepted / Rejected findings (or Done / Declined notes), the main plan changes, and anything the human should look at closely.
