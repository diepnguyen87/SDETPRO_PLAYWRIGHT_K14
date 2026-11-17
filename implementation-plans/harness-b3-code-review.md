# Implementation Plan: Harness B3 — `ai/review.ts --mode code`

Part of `implementation-plans/harness-b-implement.md` (Slice B, stage 5).

## Objective

After `/implement-plan` sets `Status: Implemented`, OpenAI reviews the generated code once, independently of Claude:
plan + requirement + rules + the diff + the changed files + the test results. Findings `C<n>` are written to
`implementation-review/<plan>.code.json|md`; from `Awaiting Human Code Review` on, `plan-check` requires every `C<n>`
to be answered in `## Code Review Resolution`. B4 (`/revise-code` + runner) consumes this output.

## Decisions (2026-11-17)

| Topic | Decision |
|---|---|
| Diff source | `git diff HEAD` + untracked (not ignored) files by default — the same set as `check-scope` / `check-arch`. `--base <rev>` diffs another commit against the working tree; `--base <from>..<to>` diffs two commits (no untracked files, contents read at `<to>`) — for re-reviewing committed work, e.g. REQ-002 in Verification |
| Excluded from the diff | The plan itself (sent whole, including Implementation Notes) and `implementation-review/` |
| Gate results | Not re-run by `review.ts` (tests take minutes). It reads the `harness-results/tests/<timestamp>.json` cited in the plan's `Implementation Notes` → `Tests:` entry; no cited or readable file → error. Gate text (tsc, arch, scope, `--list`) already lives in Implementation Notes |
| Status precondition | `--mode code` requires `Status: Implemented`; empty diff → error ("nothing to review") |
| Who sets `Code Reviewed` | Not `review.ts` (plan mode does not set `Plan Reviewed` either; `harness/agent/plan.ts` does). The B4 runner sets it after a successful review. In B3 the status is not changed (Q1) |
| Schema | Same shape as the plan review (verdict, summary, findings, assumptions, validationChecklist); finding ids `C<n>`; `action` is a concrete code change |
| `Code Changes Requested` status | Comes with B4 (`--revise`), not here |

---

## 1. `ai/review.ts`

- Args: `--mode plan|code` (existing parsing), new `--base <rev>` (code mode only; validated with
  `git rev-parse --verify`). `PLAN_ARG` parsing also skips the value after `--base`. Unknown mode → error.
- Plan mode: unchanged (same context, instructions, outputs). `--dry-run` output for a plan must stay identical.
- Code mode, `collectCodeContext()`:
  1. Read the plan; check `Status: Implemented`.
  2. Changed files = `git diff --name-only <base|HEAD>` + `git ls-files --others --exclude-standard`, minus the plan
     and `implementation-review/`. Empty → error.
  3. Context, in order (labels as in plan mode, `MAX_FILE_CHARS` / `MAX_TOTAL_CONTEXT_CHARS` unchanged):
     - `PROJECT RULES` — CLAUDE.md, plus each `RULE_FILES` entry whose scope matches a changed file or a Relevant File.
     - `REQUIREMENT` — from the `Requirement:` line (if present).
     - `IMPLEMENTATION PLAN` — the plan, including Review Resolution and Implementation Notes.
     - `DIFF` — `git diff <base|HEAD> -- <tracked changed files>` (unified, default context).
     - `CHANGED FILE` — full current content of every changed file (untracked ones labelled `NEW FILE (untracked)`).
     - `UNCHANGED SOURCE` — Relevant Files that did not change (context to verify that called methods exist).
     - `TEST RESULTS` — the cited `harness-results/tests/<timestamp>.json`.
- `buildCodeReviewInstructions()` — one-pass review of the change, not of the whole codebase. Areas:
  requirement coverage in the actual code (each AC/E proved by a real assertion), conformance to the approved plan
  (deviations must be recorded as `D<n>` and stay inside Relevant Files), architecture layers and the CLAUDE.md
  rules (withHealing, no CSS/XPath getter, `dynamic<Name>` templates, TestDataProvider, TAG, fixture import),
  TypeScript and Playwright correctness, flakiness, regressions in callers of changed shared methods, and whether
  the test results actually cover the plan's specs and passed. Do not report pre-existing code outside the diff
  unless the change makes it wrong. Same classification, severity and verdict rules as plan mode.
- Outputs `implementation-review/<plan>.code.json` and `.code.md`; console summary as in plan mode.
- `--dry-run` lists the context (label, path, size), the base used and the output paths, without calling OpenAI.

## 2. `ai/ReviewSchema.ts`

- `CODE_REVIEW_JSON_SCHEMA`: same structure as `PLAN_REVIEW_JSON_SCHEMA`, `id` described as `C1, C2, ...`,
  `action` as the concrete code change. Built from one shared helper so the two schemas cannot drift.
- `renderCodeReviewMarkdown()` (title `# Code Review: <plan>`, plus the diff base) sharing the plan renderer's body.
- Types `PlanReview` / `ReviewFinding` reused (a code review has the same fields).

## 3. `harness/checks/plan-check.ts` and template

- From `Awaiting Human Code Review` on, if `implementation-review/<plan>.code.json` exists, `## Code Review Resolution`
  must answer every finding as `- C<n> Accepted|Rejected: ...` (same pattern as `F<n>`).
- `implementation-plans/_TEMPLATE.md`: optional `## Code Review Resolution` section after Implementation Notes.

## 4. Documentation

- `CLAUDE.md` AI Review Tool section: `--mode code [--base <rev>]`, its inputs and outputs, `C<n>` / Code Review Resolution;
  remove "not implemented yet".
- `implementation-plans/agent-harness.md` and `harness-b-implement.md`: B3 marked done; the B3 line no longer says
  "sets `Code Reviewed`" — the B4 line says the runner sets it after `ai:review --mode code` succeeds.

---

## Open Questions

- Q1: Should `review.ts --mode code` set `Status: Code Reviewed` itself (as the Slice B summary currently says), or leave it
  to the B4 runner like plan mode does? The plan assumes the runner (consistent with `harness/agent/plan.ts`).
  → A: B — the B4 runner sets `Code Reviewed`; `review.ts` never edits the plan (2026-11-17).
- Q2: Run the real OpenAI code review on REQ-002 with `--base 147c3c0~1` in Verification (1 OpenAI call)? REQ-002 stays
  `Implemented`; the findings are only a smoke test, not answered or applied.
  → A: Yes, run it for real (2026-11-17).

## Verification

1. `yarn tsc --noEmit` clean.
2. Plan mode unchanged: `yarn ai:review implementation-plans/REQ-002-check-money-order-checkout.md --dry-run` lists the same
   context as before the change.
3. Negatives (no OpenAI call): code mode on a `Draft` / `Approved` plan → error; clean tree without `--base` → "nothing to
   review"; invalid `--base` → error; plan without a cited results file → error.
4. `yarn ai:review implementation-plans/REQ-002-check-money-order-checkout.md --mode code --base 147c3c0~1 --dry-run` →
   the 6 changed files (diff + full content), the 13 unchanged Relevant Files (requirement excluded, sent once), `harness-results/tests/2026-11-15T09-27-44-073Z.json`,
   CLAUDE.md + `.claude/rules/self-healing.md` (Relevant Files include `tests/fixtures/base.ts`); total within limits.
5. If Q2 is yes: the same command without `--dry-run` writes `REQ-002-check-money-order-checkout.code.json|md` with `C<n>` ids.
6. plan-check: a scratch copy of the REQ-002 plan set to `Awaiting Human Code Review` fails while a `C<n>` is unanswered and
   passes once every id has an `Accepted|Rejected` line.
7. `yarn harness:check-plan` on all existing plans still passes.

## Implementation Notes

Deviations:
- D1: `--base` also accepts `<from>..<to>`. With `--base 147c3c0~1` alone, the REQ-002 review would also have included the
  B3 plan commit and the uncommitted B3 code; the range limits it to the REQ-002 commit. Verification steps 4–5 use
  `--base 147c3c0~1..147c3c0`.

Gates and checks (2026-11-17):
- `yarn tsc --noEmit` — passed.
- Plan mode: `--dry-run` output for REQ-002 identical to before the change (scratch diff).
- Negatives, all rejected with a clear message: `--mode foo`, `--base` in plan mode, `--base` without value, `--base nope`,
  `--base HEAD..HEAD` ("Nothing to review"), REQ-001 (`Awaiting Human Review`), a plan copy without a cited result file.
- Code dry-run `--base 147c3c0~1..147c3c0`: 6 CHANGED FILE + DIFF, 13 UNCHANGED SOURCE, CLAUDE.md + self-healing rules,
  `harness-results/tests/2026-11-15T09-27-44-073Z.json`; 110 162 chars.
- Real run (1 OpenAI call, `gpt-5.3-codex`): APPROVE, 0 findings → `implementation-review/REQ-002-check-money-order-checkout.code.json|md`.
- plan-check with a temporary fake `.code.json` (C1, C2) on a scratch copy at `Awaiting Human Code Review`: fails with C1+C2 missing,
  fails with C2 missing, passes with both answered; at `Code Reviewed` not required yet. Fake file removed.
- `yarn harness:check-plan` passes for REQ-001 and REQ-002; the other plans are skipped as before.

## Relevant Files

- ai/review.ts
- ai/ReviewSchema.ts
- harness/checks/plan-check.ts
- harness/checks/scope-check.ts
- harness/agent/plan.ts
- harness/agent/run-tests.ts
- implementation-plans/_TEMPLATE.md
- implementation-plans/agent-harness.md
- implementation-plans/harness-b-implement.md
- implementation-plans/REQ-002-check-money-order-checkout.md
- CLAUDE.md
