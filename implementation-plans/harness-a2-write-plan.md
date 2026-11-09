# Implementation Plan: Harness A2 — `/write-plan` Skill

Part of `implementation-plans/agent-harness.md` (Slice A, stage 1).

## Objective

Claude reads a requirement that passes `check-req`, explores the code and writes
`implementation-plans/REQ-<nnn>-<slug>.md` from the template with `Status: Draft`, passing `check-plan`,
without editing any code. Invoked manually in A2 and headless (`claude -p`) in A4, so it never stops to ask.

## Decisions (2026-11-09)

| Topic | Decision |
|---|---|
| Plan file name | Same as the requirement: `implementation-plans/REQ-<nnn>-<slug>.md` |
| Open questions | New `## Open Questions` section (`- Q<n>: ...` answered by `→ A: ...`); a plan cannot be `Approved` or later with an unanswered question |
| Verification run | `claude -p` from a separate process (fresh context), an early piece of A4 |

---

## 1. `.claude/skills/write-plan/SKILL.md`

`allowed-tools`: Read, Grep, Glob, `Edit(implementation-plans/**)`, `Bash(yarn harness:check-req *)`, `Bash(yarn harness:check-plan *)`, `Bash(git log:*)`, Playwright MCP navigate/snapshot/close.

1. Gate: `yarn harness:check-req <file>`; on failure stop and report, no plan.
2. Read `CLAUDE.md` (+ the matching `.claude/rules/` file if the requirement touches the self-healing pipeline or CI).
3. Reuse before creating: for each AC/E find existing pages, components, flows and test data; grep every method the plan cites; methods to be created are listed under Changes by Layer.
4. Optional real-page check: `browser_navigate` / `browser_snapshot` only on pages reachable without interaction; no clicks, no login.
5. Design: layer order, locator priority, `pages.json` for new pages, `TestDataProvider`, `TAG`, independent tests, a web-first assertion per AC, `Not automated: <reason>` otherwise.
6. Write `implementation-plans/REQ-<nnn>-<slug>.md` from `_TEMPLATE.md`, `Status: Draft`, empty Review Resolution. Write no other file.
7. Never ask mid-run; record unknowns as `## Open Questions`.
8. `yarn harness:check-plan <plan>` until it passes.
9. Report: plan path, traced vs `Not automated` ids, open questions.

## 2. Template and plan-check

- `implementation-plans/_TEMPLATE.md`: optional `## Open Questions` after Risks.
- `plan-check`: from `Approved` onwards, every `- Q<n>:` must be followed by a `→ A:` answer.

## 3. Documentation

`CLAUDE.md` Claude Code Tooling: add `/write-plan`.

---

## Verification

1. `claude -p` runs `/write-plan requirements/REQ-001-remove-cart-items.md` in a fresh process with tools limited to the skill's needs (write access only to `implementation-plans/`).
2. `check-plan` passes; `git status` shows only the new plan besides the A2 files.
3. Review against: reuse of `ShoppingCartPage.removeAllItems()` / `CartItemRowComponent.selectRemove()`; every cited method exists;
   12 AC/E rows; clean cart between tests; layer order respected.
4. Human review of the plan (stays `Draft`, input for A3).
5. Negative: a requirement failing `check-req` → the skill stops and writes no plan.
6. plan-check negative: `Status: Approved` with an unanswered `Q1` fails.

## Out of Scope

Headless runner (A4), OpenAI review (A3), automated existence check of cited methods.

## Relevant Files

- .claude/skills/write-plan/SKILL.md (new)
- implementation-plans/_TEMPLATE.md
- harness/checks/plan-check.ts
- CLAUDE.md
- requirements/REQ-001-remove-cart-items.md
