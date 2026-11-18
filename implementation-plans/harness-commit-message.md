# Implementation Plan: Commit Message Written in the Plan, Used by `agent:accept`

Follow-up to `implementation-plans/harness-b4-revise-code-runner.md` §5 (replaces the generated per-layer message, Q3 option b).

## Objective

`agent:accept` stops generating its commit message. The message is written in the plan, in the hand-written style used
before (e.g. `147c3c0`, `84dcbc5`): a short subject and a few bullets on what changed and why. `/revise-code` writes it
before handing the code to the human, the human may edit it during code review, and `agent:accept` commits it verbatim
plus the `Co-Authored-By` trailer.

## Decisions (2026-11-18)

| Topic | Decision |
|---|---|
| Where | New section `## Commit Message` in the plan, after `## Code Review Resolution`, holding one fenced ```` ```text ```` block |
| Format | Subject ≤ 72 characters, blank line, `- ` bullets (wrapped at ~72), optional one-line review/test summary. No `Co-Authored-By` line — the runner adds it |
| Who writes it | `/revise-code` (always the last Claude stage before the human, in both full and `--revise` runs); a plan implemented interactively gets it from Claude in that session. The human may edit it while the status is `Awaiting Human Code Review` |
| Gate | `plan-check`, from `Awaiting Human Code Review` on (except `Code Changes Requested`): the section exists, has a ```` ```text ```` block, a non-empty subject ≤ 72 characters, and no `Co-Authored-By` line |
| `agent:accept` | Reads the block, appends a blank line + the trailer, commits. Missing or invalid block → `check-plan` already fails before any test run |
| Existing plans | REQ-001 and REQ-003 (`Accepted`) get the section with the message of their commit (`861d3e0`, `84dcbc5`), so `check-plan` keeps passing. REQ-002 (`Implemented`) is not affected |

---

## 1. `harness/agent/accept.ts`

- Remove `LAYERS`, `addedPublicMethods()`, `changesByLayer()`, `reviewSummary()` and the generated `commitMessage()`.
- New `commitMessage(plan)`: the content of the ```` ```text ```` block under `## Commit Message`, trimmed, + `\n\n` + `CO_AUTHOR`.
- Stages, gates, test re-run and `git add` set unchanged.

## 2. `harness/checks/plan-check.ts`

New check as in Decisions; message names the problem (`missing section`, `no ```text block`, `subject longer than 72`, `contains Co-Authored-By`).

## 3. Skills and template

- `.claude/skills/revise-code/SKILL.md` §7: before setting `Awaiting Human Code Review`, write (or update, keeping the human's
  edits) `## Commit Message`: subject `Implement REQ-<nnn>: <short title>`, bullets on what changed and why from the actual diff,
  one line with the code review verdict and the test result. Example in the skill.
- `implementation-plans/_TEMPLATE.md`: optional `## Commit Message` section with the format.

## 4. Existing plans and docs

- `REQ-001-remove-cart-items.md`, `REQ-003-arch-check-locator-list-read.md`: add the section (their real commit messages, without the trailer).
- `CLAUDE.md`: accept runner commits the plan's `## Commit Message`; `/revise-code` writes it.
- `harness-b4-revise-code-runner.md` §5: one line "superseded by `harness-commit-message.md`".

---

## Verification

1. `yarn tsc --noEmit`; `yarn harness:test`.
2. `plan-check` on scratch copies at `Awaiting Human Code Review`: no section → fails; no block → fails; subject 80 chars → fails;
   `Co-Authored-By` inside → fails; valid → passes; at `Implemented` / `Code Changes Requested` → not required.
3. `yarn harness:check-plan` passes for REQ-001, REQ-002, REQ-003.
4. `commitMessage()` on REQ-003 (tsx snippet) returns the plan block + trailer, identical to `git log -1 84dcbc5 --format=%B`.
5. `agent:accept` on a scratch copy without the section stops at `check-plan`, before the test re-run.
6. The next real `agent:implement` → `agent:accept` run shows the section written by `/revise-code` and committed verbatim.

## Relevant Files

- harness/agent/accept.ts
- harness/checks/plan-check.ts
- .claude/skills/revise-code/SKILL.md
- implementation-plans/_TEMPLATE.md
- implementation-plans/REQ-001-remove-cart-items.md
- implementation-plans/REQ-003-arch-check-locator-list-read.md
- implementation-plans/harness-b4-revise-code-runner.md
- CLAUDE.md
