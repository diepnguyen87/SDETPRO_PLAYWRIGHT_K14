# Implementation Plan: Harness A3 — OpenAI Plan Review with a Machine-Readable Verdict

Part of `implementation-plans/agent-harness.md` (Slice A, stage 2).

## Objective

`ai/review.ts` reviews a pipeline plan against its requirement and the code, and returns a verdict and
findings that code can read, so the revise step (and later the A4 runner) can act on them.

## Decisions (2026-11-09)

| Topic | Decision |
|---|---|
| `--mode code` | Slice B; A3 implements plan mode only |
| Verification | One real OpenAI call on the REQ-001 plan |
| Revision | Claude revises the REQ-001 plan from the findings in A3 (preview of A4) |

## Problems in the current tool

1. The review areas are hardcoded for an old task (login mid-flow, `LoginComponent`, `LOGIN_EMAIL`).
2. The requirement file is not sent.
3. `(new)` entries in Relevant Files are read as paths ("could not be read").
4. Free-form markdown always written to `implementation-review/openai-review.md`.
5. The template, Traceability and human answers to Open Questions are unknown to the reviewer.

---

## Changes

1. CLI `yarn ai:review <plan> [--mode plan] [--dry-run]`; `--mode code` reports "not supported yet (Slice B)";
   `--dry-run` prints the context files and sizes without calling OpenAI.
2. Context: `CLAUDE.md`; `.claude/rules/self-healing.md` / `github-actions.md` when Relevant Files touch those paths;
   the requirement from `Requirement:`; the plan; existing Relevant Files; `(new)` entries as `[NEW FILE — created by this plan]`.
3. Generic plan-review prompt: one pass, REQUIRED_FIX / RECOMMENDED / VERIFICATION, no invented problems; review areas =
   requirement coverage per AC/E, layers, cited methods exist, TypeScript/Playwright correctness, data/env, regression,
   self-healing compatibility, assertion quality, missing files. Human `→ A:` answers are binding.
4. Structured output (Responses API `text.format` json_schema, strict) defined in `ai/ReviewSchema.ts`:
   `verdict`, `summary`, `findings[{ id, type, severity, file, problem, action, requirementIds }]`, `assumptions`, `validationChecklist`.
5. Output per plan: `implementation-review/<plan-name>.plan.json` + `.plan.md` rendered from the JSON.
6. `plan-check`: when `implementation-review/<plan-name>.plan.json` exists, from `Awaiting Human Review` on,
   `Review Resolution` must answer every finding id (`- F<n> Accepted|Rejected: ...`).
7. `CLAUDE.md` AI Review Tool section updated; the tool stays standalone.

`Status` changes are not made by `review.ts` (A4 runner); in A3 they are set by hand.

## Verification

1. Typecheck clean.
2. `--dry-run` on the REQ-001 plan: requirement included, two `(new)` files labelled, no "could not be read".
3. One real OpenAI review of the REQ-001 plan: JSON valid, markdown rendered, findings point to real files.
4. plan-check with a fake review JSON: a missing finding answer fails, all answered passes.
5. Revise the REQ-001 plan from the findings, fill Review Resolution, set `Status: Awaiting Human Review`, `check-plan` passes.

## Relevant Files

- ai/review.ts
- ai/ReviewSchema.ts (new)
- harness/checks/plan-check.ts
- CLAUDE.md
- implementation-plans/REQ-001-remove-cart-items.md
- requirements/REQ-001-remove-cart-items.md
