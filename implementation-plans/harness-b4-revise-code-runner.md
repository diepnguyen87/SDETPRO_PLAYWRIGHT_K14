# Implementation Plan: Harness B4 — `/revise-code` and the Implement / Accept Runners

Part of `implementation-plans/harness-b-implement.md` (Slice B, stages 4–6 end to end).

## Objective

Chain B2 and B3 into one headless run that stops at the human, plus the send-back loop and the final commit:

```
yarn agent:implement implementation-plans/<plan>.md          (Status: Approved, clean tree)
  check-plan → claude -p /implement-plan → status Implemented → runner gates + cited tests passed
  → ai:review --mode code → Status: Code Reviewed
  → claude -p /revise-code → runner gates → check-plan → Status: Awaiting Human Code Review → stop

yarn agent:implement --revise implementation-plans/<plan>.md  (Status: Code Changes Requested, HC<n> notes)
  → claude -p /revise-code → runner gates → check-plan → Awaiting Human Code Review → stop   (no new OpenAI review)

yarn agent:accept implementation-plans/<plan>.md             (Status: Accepted, set by the human)
  check-plan → gates → re-run the specs of the last cited test run → git commit on main (no push)
```

## Decisions (2026-11-17)

| Topic | Decision |
|---|---|
| Send-back status | New `Code Changes Requested`, set only by the human, after `Awaiting Human Code Review` in `STATUSES` |
| Human code notes | `## Human Code Review Notes` with `- HC<n>: ...`; answered in `## Code Review Resolution` as `- HC<n> Done|Declined: ...` (separate prefix from the plan-stage `H<n>`, so the two loops never collide) |
| Who sets status | Runner: `Code Reviewed` after a successful `ai:review --mode code` (B3 Q1). Skills: `Implemented` (`/implement-plan`), `Awaiting Human Code Review` (`/revise-code`). Human: `Approved`, `Code Changes Requested`, `Accepted` |
| Runner gates | The runner re-runs `tsc`, `check-arch`, `check-scope`, `--list` itself after each Claude stage instead of trusting the notes. Specs are not re-run there; the runner checks that the last `harness-results/tests/*.json` cited in Implementation Notes has `exitCode 0` and `failed 0` |
| Fix-round cap | Enforced by the runner: counts new `harness-results/tests/*.json` files written during a Claude stage; more than 4 for `/implement-plan` (first run + 3 fix rounds) or 3 for `/revise-code` → stage fails. The skills say "one `harness:run-tests` call per round, all specs in it" |
| Blocked | `/implement-plan` leaves `Approved` + `Blocked:` → runner stops after that stage with the `Blocked:` text; nothing reverted |
| Scope guard | After each Claude stage `harness:check-scope <plan>` (diff ⊆ Relevant Files + plan + `implementation-review/`). The skills' `allowed-tools` keep `ai/`, `tests/fixtures/`, `harness/`, `.claude/` out of reach |
| Accept | Requires `Accepted` + gates + a fresh `harness:run-tests` of exactly the spec files in the last cited result (catches edits the human made during code review); then `git add` the changed files (the `check-scope` set) + plan + review files and commit on `main`. No push |
| Shared runner code | `Runner`, `runCommand`, `readStatus`, `setStatus`, dirty-file hashing move from `harness/agent/plan.ts` to `harness/agent/runner.ts`; `plan.ts` behaviour unchanged |

---

## 1. Status lifecycle and `plan-check`

- `STATUSES`: `… Code Reviewed, Awaiting Human Code Review, Code Changes Requested, Accepted`.
- From `Awaiting Human Code Review` on, except `Code Changes Requested`: every `HC<n>` under `## Human Code Review Notes`
  needs `- HC<n> Done|Declined` in `## Code Review Resolution` (same pattern as `H<n>`). The `C<n>` check from B3 stays.
- `_TEMPLATE.md`: lifecycle comment updated; optional `## Human Code Review Notes` section before `## Code Review Resolution`.

## 2. `harness/agent/runner.ts` (new) and `plan.ts`

Moved unchanged from `plan.ts`: `runCommand`, `readStatus`, `setStatus`, `dirtyFileHashes`, `StageFailure`, `Runner`
(`stage`, `check`, `claude`, `expectStatus`, `finish`). Parameterised: run-log folder, and the scope check after a Claude stage
(`plan.ts`: fixed prefixes `implementation-plans/`, `implementation-review/` as today; `implement.ts`: `harness:check-scope`).
New on `Runner`: `gates(plan)` (tsc, arch, scope, `--list`, each logged as its own stage), `resultFilesSince(before)`.
`plan.ts` only imports them; its stages, prompts, tool lists and log format stay the same.

## 3. `harness/agent/implement.ts` (new) — `yarn agent:implement`

- Full run: `check-plan` → status `Approved` → `git status --porcelain` empty → `claude -p "/implement-plan <plan>"`
  (tools = the skill's `allowed-tools` + `Skill`, `--max-turns 150`) → scope + fix-round cap → status `Implemented`
  (if still `Approved`: stop, print `Blocked:`) → gates → cited result passed → `yarn ai:review <plan> --mode code`
  (verdict + finding count in the log) → `setStatus("Code Reviewed")` → `revise`.
- `revise` (shared with `--revise`): `claude -p "/revise-code <plan>"` (`--max-turns 100`) → scope + cap → gates →
  cited result passed → `check-plan` → status `Awaiting Human Code Review`.
- `--revise`: status `Code Changes Requested` → `revise`.
- Run log `harness-results/agent-implement/<plan>-<timestamp>.json` (stages, Claude turns and cost, review verdict,
  test-result files). Exit code 1 on any stop.

## 4. `.claude/skills/revise-code/SKILL.md` (new)

Headless, never asks. Same `allowed-tools` as `/implement-plan`.
1. Gate: `Code Reviewed` → C<n> findings from `implementation-review/<plan>.code.json`; `Code Changes Requested` → new `HC<n>`
   notes. Anything else → stop.
2. Read the plan, requirement, rules, the review file, the current diff (`git diff HEAD`) and every file a finding names.
3. Each `C<n>`: verify against the code and rules → **Accepted** (change the code, within Relevant Files, same rules as
   `/implement-plan` §3/§6) or **Rejected** (evidence: file, rule, plan `→ A:`). `VERIFICATION` findings: check them (test run,
   MCP snapshot) and accept or reject with the result. Each `HC<n>`: **Done** or **Declined** (only if it contradicts a rule).
4. Code changed → gates (§4 of `/implement-plan`) → `harness:run-tests` with the plan's specs + affected specs, one call per round,
   at most 3 rounds; update `Implementation Notes` (`Tests:` cites the new result file, new `D<n>` if any).
5. Write `## Code Review Resolution` (reference to the review file and verdict; one line per id, keep existing lines).
6. All pass → `Status: Awaiting Human Code Review`, `check-plan`. Still failing after 3 rounds → keep the status, add `Blocked:`.
   Never commit or revert.

`/implement-plan` §5: "one `harness:run-tests` call per round with all specs" added (needed for the cap).

## 5. `harness/agent/accept.ts` (new) — `yarn agent:accept`

> Commit message superseded by `implementation-plans/harness-commit-message.md` (2026-11-18): the message is the plan's
> `## Commit Message` block, no longer generated.

`check-plan` → status `Accepted` → gates → specs of the last cited result re-run with `harness:run-tests` (must pass) →
`git add -- <changed files> <plan> implementation-review/<plan>.*` → `git commit` on `main` →
print the commit hash. Message:

```
Implement <REQ-nnn>: <plan title without "Implementation Plan: ">

Requirement: requirements/<…>.md

Changes:
- Spec: tests/web/Day25/TestRemoveCartItems.spec.ts (new)
- TestFlow: test-flows/computer/OrderTestFlow.ts — removeCartItemsAndVerify(), verifyEmptyShoppingCart(), …
- Page Object: models/pages/ShoppingCartPage.ts — getCartItemRowCount(), clickOnUpdateCartBtn(), …
- Component: models/components/cart/CartItemRowComponent.ts — getAttributes(), isRemoveSelected(), …
- Test Data: test-data/sit/cart/ShoppingCartData.json (new), test-data/TestDataProvider.ts

Plan review: <verdict>, <n> finding(s). Code review: <verdict>, <n> finding(s).
Tests: <passed>/<total> passed (harness-results/tests/<timestamp>.json, self-healing disabled).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

`Changes:` uses the plan's *Changes by Layer* headings (Spec, TestFlow, Page Object, Component, Test Data, Config), filled
from the committed diff, not from the plan prose, so it states what actually changed: each changed file under its layer
(by folder: `tests/`, `test-flows/`, `models/pages/`, `models/components/`, `test-data/`, `config/`; anything else under
`Other`), `(new)` for added files, and the names of public methods added or changed in it (from `public` declarations on
`+` lines of `git diff --cached`). Layers without changes are left out. Deterministic, no extra Claude call (Q3).

Refuses when the branch is not `main` or a changed file is outside scope. Run log `harness-results/agent-accept/`.

## 6. Documentation and config

- `package.json`: `agent:implement`, `agent:accept`.
- `CLAUDE.md`: lifecycle with `Code Changes Requested`; human-only statuses; runner section for `agent:implement` / `--revise` /
  `agent:accept`; `/revise-code` in Claude Code Tooling; `HC<n>` notes.
- `.claude/skills/write-plan/SKILL.md`, `revise-plan/SKILL.md`: only if their lifecycle text lists statuses (checked while
  implementing; no behaviour change).
- `agent-harness.md`, `harness-b-implement.md`: B4 done, Slice B done.

---

## Open Questions

- Q1: End-to-end verification needs a plan that is not implemented yet. Use REQ-001 (`Awaiting Human Review` today: you review
  it, set `Approved` and commit)? Estimated 3–6 USD Claude + 1 OpenAI call + 15–25 min, plus a `--revise` run with one `HC1`
  note and the final `agent:accept` commit of REQ-001.
  → A: Yes. REQ-001 set to `Approved` by the human (2026-11-17).
- Q2: `agent:accept` re-runs the specs (≈2–3 min, no API cost) instead of trusting the cited result. Keep that?
  → A: Yes (2026-11-17).
- Q3: Commit message format in §5 OK?
  → A: Option (b): add a per-layer summary of the changes to the body (2026-11-17).

## Verification

1. `yarn tsc --noEmit`; `yarn harness:test`.
2. `plan.ts` unchanged in behaviour: `yarn agent:plan --revise implementation-plans/REQ-002-check-money-order-checkout.md`
   stops at "plan is Changes Requested" exactly as before (no Claude call).
3. No-cost negatives: `agent:implement` on a non-`Approved` plan / with a dirty tree; `--revise` on a plan that is not
   `Code Changes Requested`; `agent:accept` on a non-`Accepted` plan and off `main` → each stops with a clear stage failure and a run log.
4. plan-check on scratch copies: `HC1` unanswered at `Awaiting Human Code Review` → fails; answered → passes; at
   `Code Changes Requested` → not required; `Code Changes Requested` is a valid status.
5. Fix-round cap: unit-level check of `resultFilesSince()` with fake result files in a scratch folder.
6. If Q1 is yes: full `agent:implement` on REQ-001 → `Awaiting Human Code Review`; human adds `HC1`, sets
   `Code Changes Requested` → `--revise` → `Awaiting Human Code Review`; human sets `Accepted` → `agent:accept` commits; run logs reviewed.

## Relevant Files

- harness/agent/plan.ts
- harness/agent/runner.ts (new)
- harness/agent/implement.ts (new)
- harness/agent/accept.ts (new)
- harness/agent/run-tests.ts
- harness/checks/plan-check.ts
- harness/checks/scope-check.ts
- .claude/skills/implement-plan/SKILL.md
- .claude/skills/revise-code/SKILL.md (new)
- .claude/skills/revise-plan/SKILL.md
- .claude/skills/write-plan/SKILL.md
- implementation-plans/_TEMPLATE.md
- implementation-plans/agent-harness.md
- implementation-plans/harness-b-implement.md
- package.json
- CLAUDE.md
