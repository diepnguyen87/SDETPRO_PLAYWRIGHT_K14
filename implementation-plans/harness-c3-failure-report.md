# Implementation Plan: Harness C3 — `/debug-failure` JSON Failure Report

Part of `implementation-plans/harness-c-execute.md` (Slice C, sub-slice C3).

## Objective

`/debug-failure` can run headless and write its result as a machine-checked JSON report, so `agent:execute` (C4) can collect a
root-cause report for every test that still fails after self-healing. Interactive use stays as today (report in chat).

```
claude -p "/debug-failure --report harness-results/failures/<run>/<project>.<title_>.json <title> | <project>"
  → reads harness-results/summary.json entry, artifacts, logs, data, component, app (debug-failure order)
  → writes the report (no other file), never edits code
yarn harness:check-failure-report <report.json>   → PASSED / FAILED with the issues
```

## Decisions (2026-11-19)

| Topic | Decision |
|---|---|
| Mode switch | `--report <path>` in the skill arguments → headless: never ask, write the JSON to `<path>`, end with a one-line summary. Without it → interactive, unchanged. The caller (C4) chooses the path |
| Report location | Only under `harness-results/failures/` (gitignored); the checker rejects a report path outside it |
| Edits | The skill never edits repository files in either mode (it already only diagnoses); headless it may write only its report |
| Tools | Skill `allowed-tools` (also what the C4 runner grants through `skillTools()`): `Read`, `Grep`, `Glob`, `Write(harness-results/failures/**)`, `Bash(git diff *)`, `Bash(git status *)`, `Bash(git log *)`, `Bash(yarn harness:run-tests *)`, `mcp__playwright__browser_navigate`, `mcp__playwright__browser_snapshot`, `mcp__playwright__browser_close`. No `Edit`, no plain `yarn playwright test` |
| Rerun (step 5) | Through `yarn harness:run-tests <spec> --grep "<regex-escaped title>$"` in both modes (self-healing off), so debugging never patches source or calls OpenAI; Q1 |
| Healing outcome values | Same enum as the summary reporter: `HEALED / MANUAL / FAILED / DISABLED / SKIPPED / NONE` |
| Category values | The skill's existing six: `locator / data / component / app / environment / config` |
| Secrets | The checker rejects a report containing an email address, a card-like number or a credential value (patterns shared with `requirement-check.ts`, exported from there); the skill masks such values in excerpts and never copies `.env*` content |

## Report schema

```json
{
  "test": { "title": "@Smoke | Test Credit Card Checkout", "file": "tests/web/Day25/TestStandardComponent.spec.ts", "project": "Desktop Chromium" },
  "run": { "summary": "harness-results/summary.json", "startedAt": "…" },
  "error": "first lines of the Playwright error",
  "failedStep": { "title": "locator.waitFor", "location": "models/components/…:21" },
  "category": "locator | data | component | app | environment | config",
  "rootCause": "what is wrong and why, 1–4 sentences",
  "evidence": [{ "file": "artifacts/…/dom.html", "excerpt": "…", "note": "…" }],
  "healing": { "outcome": "MANUAL", "reason": "…", "aiResponse": "artifacts/…/ai-response.json", "patch": { "file": "models/…Component.ts", "diff": "…" } },
  "rerun": { "result": "harness-results/tests/<timestamp>.json", "status": "failed" },
  "proposedFix": { "summary": "…", "files": ["models/…"], "needsRequirement": true },
  "confidence": 80,
  "stepsVisited": [0, 1, 2]
}
```

Required: `test` (all three), `error`, `category`, `rootCause`, `evidence` (≥ 1), `healing.outcome`, `proposedFix.summary`, `confidence`,
`stepsVisited`. Optional: `run`, `failedStep`, `healing.reason|aiResponse|patch`, `rerun`, `proposedFix.files|needsRequirement`, `evidence[].note`.

## 1. `harness/checks/failure-report-check.ts` (new) — `yarn harness:check-failure-report <file> [--json]`

Checks: path under `harness-results/failures/`; valid JSON; required fields present and non-empty; `category`, `healing.outcome` in their
enums; `confidence` integer 0–100; `stepsVisited` integers 0–6, ascending; `test.file` exists; every `evidence[].file`,
`healing.aiResponse`, `healing.patch.file`, `rerun.result` exists (project-relative); `proposedFix.files` are project-relative paths;
no secret pattern anywhere in the JSON. Same output style as the other checks (`PASSED` / `FAILED — n issue(s)`, `--json`).

## 2. `harness/checks/failure-report-check.check.ts` (new)

In-memory cases (temporary files under `harness-results/failures/_check/`, removed after): one valid report; one per rule broken
(missing field, bad enum, confidence 120, missing evidence file, path outside `failures/`, an email in an excerpt). Added to `yarn harness:test`.

## 3. `.claude/skills/debug-failure/SKILL.md`

- Frontmatter `allowed-tools` as in Decisions.
- Input: `<title> | <project>`, optional `--report <path>`; headless rules (never ask; stop at the first step that explains the failure;
  write only the report; finish with `yarn harness:check-failure-report <path>` and fix the report until it passes).
- §0 uses the summary entry (already added in C2); §5 rerun through `yarn harness:run-tests … --grep`.
- New "Report" section: the schema above, field by field, and how each step fills it.
- Rules: unchanged, plus "never edit repository files".

## 4. Documentation and config

- `package.json`: `harness:check-failure-report`; `harness:test` chain adds `failure-report-check.check.ts`.
- `harness/checks/requirement-check.ts`: `export` the existing `SECRET_PATTERNS` (no behaviour change).
- `CLAUDE.md`: Gates and Guardrails — the checker; Claude Code Tooling — `/debug-failure --report`.
- `implementation-plans/harness-c-execute.md`: C3 marked done.

---

## Open Questions

- Q1: Rerun in `/debug-failure` through `yarn harness:run-tests` (self-healing off) in both modes, instead of the plain `yarn playwright test --grep`
  used today? Plan: yes — debugging should not patch source or spend OpenAI calls; a human who wants healing runs the test directly.
  → A: Yes (2026-11-20).
- Q2: Verify the headless mode for real with a temporary, untracked failing spec under `tests/web/` (deleted afterwards, never committed),
  costing one `claude -p` call (≈ $0.3–1)? Plan: yes; otherwise the skill is only verified in C4.
  → A: Yes (2026-11-20).

## Verification

1. `yarn tsc --noEmit`; `yarn harness:check-arch`; `yarn harness:test` (arch fixtures, reporter check, failure-report check) pass.
2. `yarn harness:check-failure-report` on a hand-written valid report → PASSED; on each broken variant → FAILED naming the rule.
3. Interactive skill unchanged apart from the rerun command (read the diff).
4. If Q2 is yes: a temporary spec `tests/web/_tmp/TmpFailure.spec.ts` (imports `test` from the fixture, opens `/`, asserts a wrong page title
   through an existing flow/page method) → `yarn playwright test` it (summary written) → `claude -p "/debug-failure --report
   harness-results/failures/c3-check/Desktop_Chromium.tmp.json <title> | Desktop Chromium"` with the skill's tools → report passes the checker,
   `category` plausible, `git status` shows no tracked change → delete the temporary spec.
5. `yarn harness:check-scope implementation-plans/harness-c3-failure-report.md`.

## Implementation Notes

Deviations:
- D1: Skill input is `[--report <path>] [--project <browser project>] <test title>` instead of `<title> | <project>`: test titles already
  contain ` | ` (`@Smoke | Test …`), so the separator was ambiguous. Project defaults to `Desktop Chromium`.
- D2: Bug in C2 found by the real run: `HealingEngine` logs `AI analysis failed` with `console.error`, so it is in the test's stderr, not
  stdout; the summary showed healing `NONE` for a test whose AI analysis failed. `summary-reporter.ts` now reads stdout and stderr, and its
  check uses stderr for that case (`summary-reporter.check.ts` added to Relevant Files).
- D3: The skill grants `Edit(harness-results/failures/**)`, not `Write(...)`: the first headless run was denied the write (`Write(path)`
  is not a path rule; `Edit(path)` covers all file-writing tools, as `/implement-plan`'s `Edit(models/**)` does for new files).

Checks (2026-11-20):
- `yarn tsc --noEmit`, `yarn harness:check-arch`, `yarn harness:test` (arch fixtures, 15 reporter checks, 12 failure-report checks),
  `yarn playwright test --list` — passed.
- Real headless run (Q2): temporary untracked `tests/web/_tmp/TmpFailure.spec.ts` (opens `/`, calls `verifyEmptyShoppingCart()` without
  opening the cart) run with the config reporters → `summary.json`: failed, failed step `Wait for navigation` at `models/pages/BasePage.ts:45`,
  healing `FAILED` (`AI analysis failed`, no OpenAI credits). `claude -p "/debug-failure --report harness-results/failures/c3-check/… --project
  Desktop Chromium @Regression | Tmp Failure Empty Cart On Home"` with the skill's `allowed-tools`: first run denied the write (D3, $0.59);
  second run 10 turns, $0.28, 0 denials, report `PASSED` the checker — category `component`, confidence 95, steps 0–5, 6 evidence files,
  proposed fix "call `navigateToShoppingCartPage()` before `verifyEmptyShoppingCart()`". No tracked file changed by Claude (`git status` list
  identical before/after). Temporary spec deleted, `yarn harness:clean` run.

## Relevant Files

- harness/checks/failure-report-check.ts (new)
- harness/checks/failure-report-check.check.ts (new)
- harness/checks/requirement-check.ts
- harness/checks/markdown.ts
- harness/reporters/summary-reporter.ts
- harness/reporters/summary-reporter.check.ts
- harness/agent/runner.ts
- .claude/skills/debug-failure/SKILL.md
- package.json
- CLAUDE.md
- implementation-plans/harness-c-execute.md
