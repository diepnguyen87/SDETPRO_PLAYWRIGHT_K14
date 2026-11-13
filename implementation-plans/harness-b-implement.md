# Implementation Plan: Harness Slice B — Implement → OpenAI Code Review → Revision → Human

Part of `implementation-plans/agent-harness.md` (stages 4–6).

## Objective

An `Approved` plan is implemented by Claude, gated by machine checks, reviewed once by OpenAI, revised by Claude
and handed to the human for code review:

```
yarn agent:implement implementation-plans/<plan>.md
  plan Approved + clean working tree
  → claude -p /implement-plan → gates → Status: Implemented
  → ai:review --mode code      → Status: Code Reviewed
  → claude -p /revise-code     → gates → Status: Awaiting Human Code Review → stop
yarn agent:accept implementation-plans/<plan>.md   (after the human sets Accepted)
```

Gates: `tsc`, `arch-check`, `scope-check`, `--list`, the plan's specs. Code stays uncommitted during Slice B, so
`git diff HEAD` (plus untracked files) is exactly the plan's change.

## Decisions (2026-11-11)

| Topic | Decision |
|---|---|
| Self-healing during agent test runs | Run tests with `HEALING_RERUN=true` (existing guard): healing skipped, failures surface to the agent, no pipeline change |
| Human send-back at code stage | New status `Code Changes Requested` (lifecycle: … → Awaiting Human Code Review → Code Changes Requested → … → Accepted) |
| Commit after acceptance | `yarn agent:accept <plan>`: requires `Accepted`, re-runs the gates, commits on `main` with a message from the plan, no push |
| Order | B1 → B2 → B3 → B4, each verified on REQ-002 |

## Sub-slices

- **B1 Guardrails and checks:** `harness/checks/arch-check.ts` (TypeScript compiler API, rules from CLAUDE.md, baseline for existing
  violations), `harness/checks/scope-check.ts` (diff ⊆ Relevant Files), PreToolUse hook (`.env*`, `.auth/` blocked; self-healing
  pipeline files ask).
- **B2 `/implement-plan` skill:** implements Changes by Layer only, runs the gates and the plan's specs (debugging per `/debug-failure`,
  never bypassing `withHealing()`), adds `## Implementation Notes`, sets `Implemented`.
- **B3 `ai/review.ts --mode code`:** plan + requirement + rules + `git diff HEAD` + changed files + gate results; findings `C<n>` in
  `implementation-review/<plan>.code.json|md`; `plan-check` requires `## Code Review Resolution` to answer every `C<n>`.
- **B4 `/revise-code` + runner:** answers every `C<n>`, re-runs the gates, sets `Awaiting Human Code Review`; `yarn agent:implement`
  (with `--revise` for `Code Changes Requested` + `## Human Code Review Notes`), `yarn agent:accept`; run logs in
  `harness-results/agent-implement/`.

## Verification

1. Gates catch planted violations (CSS locator getter, direct `click()`, file outside Relevant Files).
2. Full run on REQ-002 once approved, then REQ-001 (estimate 3–6 USD Claude + 1 OpenAI call + 10–20 min each).
3. `Code Changes Requested` → `--revise` loop.

## Relevant Files

- implementation-plans/agent-harness.md
- harness/agent/plan.ts
- harness/checks/plan-check.ts
- ai/review.ts
- .claude/settings.json
- CLAUDE.md
