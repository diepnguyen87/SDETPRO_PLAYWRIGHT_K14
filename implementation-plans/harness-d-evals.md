# Implementation Plan: Harness Slice D — Agent Evals

Part of `implementation-plans/agent-harness.md` (Slice D). Turns the manual trials of `implementation-plans/skill-trial.md` (Part A,
B1, B2) and the requirement → plan stage into repeatable, machine-checked scenarios.

## Objective

After a change to a skill, `CLAUDE.md` or the harness, one command re-runs a fixed set of agent scenarios headless and says, per
scenario, whether Claude still reaches the right result:

```
yarn harness:eval --list                 → scenarios, what they check, estimated cost
yarn harness:eval <id...> | --all        → for each: clean-tree gate → prepare (plant a break / copy a fixture)
                                           → claude -p "/<skill> …" (scenario tools) → assertions → restore
                                           → harness-results/evals/<run>.json + table; exit 1 if any assertion failed
```

Evals are run on demand by the human (they cost Claude credits), not in CI and not by the other runners.

## Decisions (2026-11-20)

| Topic | Decision |
|---|---|
| Where scenarios run | The main working tree, not a git worktree (Q1): a worktree has no `node_modules`, `.env*` or auth state, and copying them is what the guard exists to prevent. Gate: no modified tracked file at start; every planted or created change is restored in a `finally` |
| Restore | Tracked files changed during the scenario → `git restore --source=HEAD --staged --worktree -- <files>`; untracked files that did not exist at start → deleted (untracked files present at start are kept). Restore failure → stop all scenarios and print what is left |
| Scenario format | One TypeScript module `harness/evals/scenarios.ts` exporting `Scenario[]`: `id`, `title`, `estimatedCostUsd`, `prepare()`, `prompt`, `tools` (default `skillTools(skill)`), `maxTurns`, `assertions[]` (`name`, `check(): Promise<true \| string>`). Runner `harness/evals/run.ts` on `harness/agent/runner.ts` |
| Assertions | Deterministic only: files and fields (report category, evidence file, new data file, plan status), the existing checkers (`check-failure-report`, `check-plan`, `check-arch`, `tsc`), and "Claude changed nothing outside the allowed paths". No LLM grading |
| Cost guard | No argument → prints the list, runs nothing; `--all` or ids required (Q3). The table and result file record turns and cost per scenario |
| Failing test runs | Scenarios that need a failure run Playwright with the config reporters and `SELF_HEALING_DISABLED=true`, so `summary.json` is written and no OpenAI call or source patch happens (healing end to end is covered by `agent:execute`, C4) |
| Result | `harness-results/evals/<run>.json`: per scenario `passed`, each assertion `ok` / reason, Claude turns / cost / denials, duration, restore outcome |

## Scenarios (Q2)

| Id | Skill | Prepare | Assertions | Est. |
|---|---|---|---|---|
| `debug-data` | `/debug-failure --report` | Change `message` in `test-data/sit/checkout/TermsOfServiceWarningData.json`; run `TestStandardComponent.spec.ts --grep "Test Credit Card Checkout$"` (fails at the TOS warning assertion) | report passes the checker; `category` = `data`; an `evidence[].file` is that JSON; no other file changed | $0.3 |
| `debug-locator` | `/debug-failure --report` | Change `checkoutBtnSel` in `models/components/cart/TotalComponent.ts` to a non-existent id; run `TestCheapComponent.spec.ts` (fails at `clickOnCheckoutBtn`) | report passes the checker; `category` = `locator`; an `evidence[].file` is `TotalComponent.ts`; `healing.outcome` = `DISABLED`; no other file changed | $0.3 |
| `add-test-data` | `/add-test-data` | — | prompt asks for SIT data with a fixed message under key `newsletter`; a new `test-data/sit/**/*Data.json` holds that message; `TestDataProvider.ts` imports it and registers `newsletter` in `sitData`; `tsc` and `check-arch` pass; only `test-data/` changed | $0.4 |
| `write-plan` | `/write-plan` | Copy the fixture `harness/evals/fixtures/REQ-900-eval-product-search.md` to `requirements/` (passes `check-req`) | `implementation-plans/REQ-900-eval-product-search.md` exists; `Status: Draft`; `check-plan` passes (Traceability covers every AC/E, Relevant Files exist); only `implementation-plans/` changed | $1.2 |

`add-test-data` declares no `allowed-tools`; its scenario passes `Read, Grep, Glob, Edit(test-data/**), Bash(yarn tsc *), Bash(yarn playwright test --list *)`.

---

## 1. `harness/evals/run.ts` (new) — `yarn harness:eval`

`--list`; ids / `--all`; per scenario: gate (no modified tracked file) → snapshot untracked files → `prepare()` → `runner.claude(prompt,
tools, maxTurns)` with a scope check limited to the scenario's allowed prefixes → assertions (all run, failures collected) → restore → next.
Writes the result file, prints `id | passed | assertions | turns | cost`, exit 1 if any scenario failed or a restore failed.

## 2. `harness/evals/scenarios.ts` (new), `harness/evals/fixtures/REQ-900-eval-product-search.md` (new)

The four scenarios above. The fixture requirement: guest searches a product from the header search box and sees matching results;
3 ACs, 1 error case (no results message); no secrets.

## 3. Documentation and config

- `package.json`: `"harness:eval": "tsx harness/evals/run.ts"`.
- `CLAUDE.md`: Gates and Guardrails — `yarn harness:eval` (on demand, costs credits, restores the tree); when to run it (after changing a
  skill, `CLAUDE.md` or the harness).
- `implementation-plans/agent-harness.md`: Slice D done; `implementation-plans/skill-trial.md`: Part B superseded by `debug-data` / `debug-locator`.

---

## Open Questions

- Q1: Run scenarios in the main working tree (clean tracked tree gate + automatic restore) instead of an isolated git worktree? Plan: main tree.
  → A: As planned (2026-11-24).
- Q2: Scenario set as in the table (≈ $2.2 per `--all`)? Plan: these four; an `/implement-plan` scenario later if needed (≈ $2–4 each).
  → A: As planned (2026-11-24).
- Q3: `yarn harness:eval` without arguments only lists (cost guard), `--all` or ids run? Plan: yes.
  → A: As planned (2026-11-24).

## Verification

1. `yarn tsc --noEmit`; `yarn harness:check-arch`; `yarn harness:test`; `yarn harness:check-req harness/evals/fixtures/REQ-900-eval-product-search.md`
   (the checker accepts a path outside `requirements/`).
2. `yarn harness:eval` and `--list` → list only, exit 0, no Claude call; `yarn harness:eval nope` → exit 2; with a modified tracked file → stops
   before any scenario.
3. Restore: a dry scenario run with a stub prompt that fails immediately (`--max-turns 1`) still restores the planted break (`git status` clean).
4. `yarn harness:eval --all` (≈ $2.2) → all four pass; `git status` clean afterwards; result file written.
5. `yarn harness:check-scope implementation-plans/harness-d-evals.md`.

## Verification Results (2026-11-24)

- Step 1: `tsc`, `harness:check-arch`, `harness:test` pass; `harness:check-req` on the fixture — PASSED.
- Step 2: no argument / `--list` → list only, exit 0; `nope` → exit 2; `--all extra` → exit 2; `--max-turns 0` → exit 2; modified tracked
  files → "Commit or stash first", exit 1, no scenario run. Fixed before commit: `parseArgs` dropped the first argument when
  `--max-turns` was absent; the clean-tree gate moved to the start of the run (it was reported as a failed restore).
- Step 3: `yarn harness:eval debug-locator --max-turns 1` → Claude stopped early, assertions failed, `TotalComponent.ts` restored,
  `git status` clean.
- Step 4: `yarn harness:eval --all` → 4/4 passed, `git status` clean, `harness-results/evals/2026-11-24T01-22-45-671Z.json`:
  `debug-data` 4/4 (8 turns, $0.36), `debug-locator` 5/5 (6 turns, $0.32), `add-test-data` 5/5 (8 turns, $0.25),
  `write-plan` 4/4 (24 turns, $0.80) — $1.73 in total.
- Step 5: `harness:check-scope` — PASSED (7 files).
- Note: `claude -p` prints "no stdin data received in 3s" on stderr when spawned by the runner; harmless (same for `agent:plan`).

## Relevant Files

- harness/evals/run.ts (new)
- harness/evals/scenarios.ts (new)
- harness/evals/fixtures/REQ-900-eval-product-search.md (new)
- harness/agent/runner.ts
- harness/checks/requirement-check.ts
- harness/checks/plan-check.ts
- harness/checks/failure-report-check.ts
- .claude/skills/debug-failure/SKILL.md
- .claude/skills/add-test-data/SKILL.md
- .claude/skills/write-plan/SKILL.md
- test-data/sit/checkout/TermsOfServiceWarningData.json
- models/components/cart/TotalComponent.ts
- test-data/TestDataProvider.ts
- tests/web/Day25/TestStandardComponent.spec.ts
- tests/web/Day25/TestCheapComponent.spec.ts
- package.json
- CLAUDE.md
- implementation-plans/agent-harness.md
- implementation-plans/skill-trial.md
