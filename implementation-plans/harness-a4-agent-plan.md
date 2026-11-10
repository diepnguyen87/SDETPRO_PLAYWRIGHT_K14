# Implementation Plan: Harness A4 — `/revise-plan` and the `yarn agent:plan` Runner

Part of `implementation-plans/agent-harness.md` (Slice A, stages 1–3 end to end).

## Objective

One command takes a requirement to a plan waiting for human review, with no human step in between:

```
yarn agent:plan requirements/REQ-<nnn>-<slug>.md
  check-req → claude -p /write-plan → check-plan → ai:review (OpenAI)
  → claude -p /revise-plan → check-plan → stop at "Awaiting Human Review"
```

## Decisions (2026-11-10)

| Topic | Decision |
|---|---|
| End-to-end requirement | REQ-002 written by Copilot with `/write-requirement` |
| Human feedback | New `## Human Review Notes` section (`- H<n>: ...`), answered as `- H<n> Done|Declined: ...` |
| Claude model | CLI default |

---

## 1. `.claude/skills/revise-plan/SKILL.md`

- Runs only on `Plan Reviewed` (after the OpenAI review) or `Changes Requested` (sent back by the human).
- `Plan Reviewed`: check every finding of `implementation-review/<plan>.plan.json` against code and rules; Accepted → change the plan body,
  Rejected → evidence-based reason; one `- F<n> Accepted|Rejected: ...` line each.
- `Changes Requested`: answer every unanswered `H<n>` note (`- H<n> Done|Declined: ...`) and apply new `→ A:` answers; no OpenAI call.
- Human `→ A:` answers are binding. Only the plan file is edited. `check-plan` must pass; ends with `Status: Awaiting Human Review`.

## 2. Runner `harness/agent/plan.ts`

- Stops at the first failing stage. `check-req` first, so a bad requirement costs no LLM call.
- `claude -p` spawned with an argument array (no shell), per-stage `--allowedTools` (write only `implementation-plans/**`,
  run only `yarn harness:check-*`), `--max-turns`, `--output-format json` (turns, cost, permission denials).
- Owns the status transitions it is responsible for: `Plan Reviewed` after a successful review.
- Refuses to run when the plan exists and is not `Draft` (full run) / `Changes Requested` (`--revise`).
- Scope check: content hashes of dirty files before/after each Claude stage; any change outside `implementation-plans/` and
  `implementation-review/` fails the run and lists the files (no automatic revert).
- Run log: `harness-results/agent-plan/<plan-name>-<timestamp>.json` (stages, durations, exit codes, Claude turns/cost, verdict,
  findings Accepted/Rejected). `harness-results/` is gitignored.
- `yarn agent:plan --revise implementation-plans/<plan>.md`: only `/revise-plan` (for `Changes Requested`).

## 3. Human Review Notes

- Template: optional `## Human Review Notes` after Open Questions.
- `plan-check`: from `Awaiting Human Review` on (except `Changes Requested`), every `- H<n>:` needs a `- H<n> Done|Declined:` line in Review Resolution.

## 4. Documentation

`CLAUDE.md`: `/revise-plan`, `yarn agent:plan`, the `Changes Requested` loop. `package.json`: `agent:plan` script.

---

## Verification

1. Typecheck clean.
2. No-cost negatives: invalid requirement stops at `check-req`; REQ-001 plan (`Approved`) is refused.
3. Full run on Copilot's REQ-002: plan `Awaiting Human Review`, `check-plan` passes, run log complete, no out-of-scope change.
4. `--revise` loop: a human `H1` note + `Changes Requested` → H1 answered, back to `Awaiting Human Review`.

## Out of Scope

Slice B (implement, `--mode code`), running the runner in CI, a PR-based gate.

## Relevant Files

- .claude/skills/revise-plan/SKILL.md (new)
- .claude/skills/write-plan/SKILL.md
- harness/agent/plan.ts (new)
- harness/checks/plan-check.ts
- harness/checks/markdown.ts
- implementation-plans/_TEMPLATE.md
- ai/review.ts
- package.json
- .gitignore
- CLAUDE.md
