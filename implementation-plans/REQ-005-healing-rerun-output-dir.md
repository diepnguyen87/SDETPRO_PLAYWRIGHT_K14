# Implementation Plan: Healing Rerun Uses Its Own Output Folder

Status: Accepted
Requirement: knowledge-base/requirements/REQ-005-healing-rerun-output-dir.md

## Objective

The healing rerun child process gets its own Playwright output folder, so it no longer empties the parent run's `test-results/` (and the parent's in-progress trace under `test-results/.playwright-artifacts-<n>/`). `TestCommandBuilder.build()` adds `--output="<healingRerunOutputFolder>/<random UUID>"`, with the base folder taken from a new `frameworkConfig.healingRerunOutputFolder` (`test-results/healing-rerun`). A healed test then ends as passed instead of failing in teardown with `ENOENT … .trace`.

## Acceptance Criteria Traceability

This is a self-healing pipeline requirement: AC1–AC3 and E2 are covered by one-off `yarn tsx -e` checks and greps, AC4 and E1 by Playwright runs with self-healing on and a local, uncommitted broken locator (they cannot run through `yarn harness:run-tests`, which disables healing). No spec is added.

| ID | Covered by (spec › flow step) | Assertion |
|---|---|---|
| AC1 | One-off check (Verification step 4) calling `TestCommandBuilder.build(metadata)` | Command contains `--output="test-results/healing-rerun/<uuid>"` whose folder starts with `frameworkConfig.healingRerunOutputFolder + "/"` and is not the base folder itself; with the `--output` part removed the command equals the pre-change command (`yarn playwright test --grep="<escaped title>$" --project="<browser>" --headed --config=playwright.config.web.js`) |
| AC2 | Same one-off check, `build()` called twice with the same metadata | The two `--output` folders differ |
| AC3 | `grep -n "test-results" ai/TestCommandBuilder.ts ai/HealingEngine.ts` and `grep -n "frameworkConfig.healingRerunOutputFolder" ai/TestCommandBuilder.ts` (Verification step 3) | First grep: no match (exit 1); second grep: one match in the `--output` line, so the folder is read from the config |
| AC4 | `tests/web/Day25/TestCheapComponent.spec.ts` › `@Regression \| Test Cheap Component`, self-healing on, `BaseItemDetailComponent.addToCartSel` locally broken (Verification step 6) | Playwright reports the test passed; console/log has no `ENOENT`; `harness-results/summary.json` test `status` `passed`, healing outcome `HEALED`; `test-results/healing-rerun/<uuid>/` exists after the run; the console line `Rerunning test: …` shows the `--output` folder |
| AC5 | Review of `.claude/rules/self-healing.md`, HealingEngine Lifecycle step 4 | The `TestCommandBuilder.build(metadata)` line shows `--output="<healingRerunOutputFolder>/<uuid>"` and says why |
| E1 | Same spec, self-healing on, `addToCartSel` and `TotalComponent.checkoutBtnSel` locally broken (Verification step 7) | The child fails at the checkout button → `[HealingEngine] Source restored from backup.`, healing outcome `FAILED` in `summary.json`; `BaseItemDetailComponent.ts` is back to its broken pre-run content (no healed value left; `.bak` handled by `BackupManager`); the test fails with the original add-to-cart action error, no `ENOENT` in the error or console |
| E2 | One-off check (Verification step 4): `build()` with two different metadata objects (different `testName`) | The two `--output` folders differ, both are under the base folder, and neither equals `test-results` or the base folder (so a rerun never empties the parent's or another rerun's folder). Concurrent end-to-end run: Not automated: Desktop Chromium runs with `workers: 1` and it would need two healable broken locators in different source files plus two OpenAI calls; uniqueness comes from `randomUUID()` per call |

## Scenarios

1. Command shape (AC1, AC2, E2) — one-off `tsx` script, no browser: build with metadata `{ testName: "@Regression | Test Cheap Component", browser: "Desktop Chromium", … }` twice, then with a second `testName`; parse `--output="…"` with a regex and compare.
2. Healed test passes (AC4) — start: clean tree, `yarn harness:clean`, guest context (fresh browser context per test, empty cart). Local change: `addToCartSel` in `models/components/BaseItemDetailComponent.ts` → `"input[id^='add-to-cart-btn']"`. Run the spec with healing on. Expected: add-to-cart fails inside `withHealing()` → AI returns a `LOCATOR` patch → rerun child (own `--output`) passes → `HEALED` → `SelfHealingSuccess` swallowed by `base.ts` → parent ends passed, trace finalizes without `ENOENT`. Afterwards restore the file from git and delete the `.bak`.
3. Rerun fails (E1) — same start; local changes: `addToCartSel` broken as above and `checkoutBtnSel` in `models/components/cart/TotalComponent.ts` → `"#checkout-broken"`. The parent heals add-to-cart, the child (no healing, `HEALING_RERUN=true`) fails on the checkout button → `BackupManager.restore()` → `FAILED` → original error re-thrown. Afterwards restore both files from git and delete any `.bak`.

## Reuse

- `HealingEngine.handle()` in `ai/HealingEngine.ts` — unchanged; it already calls `TestCommandBuilder.build(metadata)` and `TestRerunner.run(testCommand)`.
- `TestRerunner.run(command)` in `ai/TestRerunner.ts` — unchanged (`exec` with `HEALING_RERUN=true`; it logs `Rerunning test: <command>`, used for AC4).
- `Metadata` (`ai/Metadata.ts`) — unchanged; the output folder does not depend on it.
- `BackupManager`, `PatchApplier`, `PatchVerifier`, `HealingLock`, `AIResponseValidator` — unchanged.
- `tests/web/Day25/TestCheapComponent.spec.ts`, `OrderTestFlow`, `BaseItemDetailComponent.addToCartSel` (`withHealing(this.addToCartSel, l => l.click())`), `TotalComponent.checkoutBtnSel` — used as they are; the broken selectors are local and never committed.
- `harness/agent/clean.ts` `TARGETS` (contains `test-results`) and `.gitignore` (`test-results`) — the rerun folder lies inside `test-results/`, so it is cleaned and ignored without change.
- `harness/reporters/summary-reporter.ts` — unchanged; it is not written by the rerun child and its `sourceChanges` comes from `git status` (ignored `test-results/` not listed).

## Changes by Layer

### Spec
- None.

### TestFlow
- None.

### Page Object
- None.

### Component
- None.

### Test Data
- None.

### Config
- `config/framework.config.ts`: add `healingRerunOutputFolder: "test-results/healing-rerun"` to `frameworkConfig` (after `healingTimeoutPerRetryMs`). Playwright's default `outputDir` is `test-results` (not overridden in `playwright.config.web.js`), so the folder is inside it.

### Self-healing pipeline
- `ai/TestCommandBuilder.ts`:
  - imports `path` from `"path"`, `randomUUID` from `"node:crypto"` and `frameworkConfig` from `"../config/framework.config.js"`.
  - `build()`: after `--config=playwright.config.web.js`, add a one-line comment ("Own output folder: Playwright empties its outputDir at start, so sharing the parent's would delete the parent's in-progress trace"; it must not contain the string `test-results`, see AC3) and `command += \` --output="${path.posix.join(frameworkConfig.healingRerunOutputFolder, randomUUID())}"\``. The existing `--grep`, `--project`, `--headed`, `--config` lines stay as they are. A UUID (not a timestamp) so two calls in the same millisecond, in one or two workers, never share a folder.
- `ai/HealingEngine.ts`: no change.

### Docs
- `.claude/rules/self-healing.md`, HealingEngine Lifecycle step 4: the `TestCommandBuilder.build(metadata)` line becomes `… --headed --config=playwright.config.web.js --output="<frameworkConfig.healingRerunOutputFolder>/<uuid>"`, plus one sentence: own output folder per rerun, because Playwright empties its output folder at start and the parent's trace lives in `test-results/`.

## Out of Scope

- Reporters of the child process (`html` → `playwright-report/`, `allure-playwright` second result).
- Guards, `HealingLock`, `BackupManager`, `PatchApplier`, `PatchVerifier`, `TestRerunner`, `HEALING_RERUN=true`.
- `--grep`, `--project`, `--headed`, `--config` of the rerun command.
- Trace / video / screenshot settings in `playwright.config.web.js`, `playwright.config.android.js` and CI workflows.
- Cleaning up old rerun folders between runs (the parent run empties `test-results/` at start; `yarn harness:clean` removes it).
- A permanent regression check for `TestCommandBuilder` in `yarn harness:test` (needs `package.json`, outside the requirement's scope; see Q2).

## Risks

- `--output` is resolved by the child relative to its working directory; `exec()` inherits the parent worker's cwd (the project root, where `yarn playwright test` runs), so `test-results/healing-rerun/<uuid>` lands under the parent's `test-results/`. AC4 checks the folder exists there.
- The parent run deletes the per-test folders of passed tests at its end (`retain-on-failure`); the rerun folder is not a per-test folder, so it stays until the next run or `harness:clean`. Expected, as the requirement keeps it for inspection.
- AC4 / E1 depend on OpenAI: the AI may return `MANUAL` or a patch below confidence 80 for the broken selector. The C4 verification healed a similar CSS id typo; if the AI does not patch, choose another typo of `addToCartSel` and rerun (at most twice), else record the run as manual evidence (requirement Notes).
- No credits (`429`) → AC4 / E1 recorded as not verified, per requirement Notes.
- A healed run patches `BaseItemDetailComponent.ts` (the patch replaces the broken value); after AC4 the file must be restored with `git checkout -- models/components/BaseItemDetailComponent.ts` and the `.bak` deleted, so nothing healed is committed.

## Open Questions

- Q1: Who implements the plan? `ai/` and `config/framework.config.ts` are guarded pipeline files and `.claude/rules/` is outside what `/implement-plan` edits, so a headless `yarn agent:implement` would likely stop `Blocked`. Plan: Claude implements it in an interactive session (like REQ-003 / REQ-004), then `yarn ai:review --mode code`.
  → A: As planned (2026-11-21).
- Q2: Add a permanent `ai/TestCommandBuilder.check.ts` (AC1/AC2/E2 assertions) to `yarn harness:test`? That needs a `package.json` script change, outside the requirement's scope. Plan: one-off `yarn tsx -e` check only, recorded in Implementation Notes.
  → A: As planned (2026-11-21).
- Q3: E1 uses a second locally broken locator (`TotalComponent.checkoutBtnSel`) to make the child fail after a successful patch. Acceptable as the E1 setup, or should E1 be recorded from reasoning only (`HealingEngine` catch path unchanged)? Plan: run it, since it also proves no `ENOENT` on the `FAILED` path.
  → A: As planned (2026-11-21).

## Human Review Notes

## Verification

1. `yarn tsc --noEmit` — zero errors.
2. `yarn harness:check-arch ai/TestCommandBuilder.ts config/framework.config.ts` and `yarn harness:test` — pass.
3. AC3: `grep -n "test-results" ai/TestCommandBuilder.ts ai/HealingEngine.ts` — no output; `grep -n "frameworkConfig.healingRerunOutputFolder" ai/TestCommandBuilder.ts` — one match (the `--output` line).
4. AC1 / AC2 / E2: `yarn tsx -e 'import TestCommandBuilder from "./ai/TestCommandBuilder.js"; import { frameworkConfig } from "./config/framework.config.js"; const m = { testName: "@Regression | Test Cheap Component", testFile: "x", browser: "Desktop Chromium", stackTrace: "", url: "", failedLocator: "", timestamp: "" }; const out = (c: string) => /--output="([^"]+)"/.exec(c)?.[1] ?? ""; const a = TestCommandBuilder.build(m), b = TestCommandBuilder.build(m), c = TestCommandBuilder.build({ ...m, testName: "@Smoke | Other" }); const base = frameworkConfig.healingRerunOutputFolder; const ok = [a, b, c].every(x => out(x).startsWith(base + "/") && out(x) !== base) && out(a) !== out(b) && out(a) !== out(c) && a.replace(/ --output="[^"]+"/, "") === "yarn playwright test --grep=\"@Regression \\| Test Cheap Component$\" --project=\"Desktop Chromium\" --headed --config=playwright.config.web.js"; console.log(a); console.log(b); console.log(ok ? "OK" : "FAIL"); process.exit(ok ? 0 : 1)'` — prints `OK`.
5. `yarn playwright test --list --config=playwright.config.web.js` — specs and data load. `yarn harness:run-tests tests/web/Day25/TestCheapComponent.spec.ts` — passes (healing off; the change does not affect normal runs; this is the cited test result).
6. AC4 (healing on, OpenAI credits): clean tree; set `addToCartSel` to `"input[id^='add-to-cart-btn']"` (uncommitted); `yarn harness:clean`; `yarn playwright test tests/web/Day25/TestCheapComponent.spec.ts --config=playwright.config.web.js --project="Desktop Chromium"` (or `yarn agent:execute --spec tests/web/Day25/TestCheapComponent.spec.ts`, which needs no modified tracked file — so use the direct run). Check: test passed, no `ENOENT` in the output, `harness-results/summary.json` status `passed` + healing `HEALED`, `ls test-results/healing-rerun/` shows one UUID folder, `Rerunning test:` line has `--output=`. Then `git checkout -- models/components/BaseItemDetailComponent.ts` and delete `models/components/BaseItemDetailComponent.ts.bak`.
7. E1 (healing on): break `addToCartSel` as in step 6 and `checkoutBtnSel` to `"#checkout-broken"`; `yarn harness:clean`; same command. Check: test failed with the add-to-cart action error, healing `FAILED`, `Source restored from backup.` in the output, no `ENOENT`. Then `git checkout -- models/components/BaseItemDetailComponent.ts models/components/cart/TotalComponent.ts` and delete any `.bak`.
8. `git status` — only the plan's Relevant Files changed; `yarn harness:check-scope implementation-plans/REQ-005-healing-rerun-output-dir.md`.

The last result file cited in Implementation Notes must be the passing step 5 `harness:run-tests` run.

## Review Resolution

Review: `implementation-review/REQ-005-healing-rerun-output-dir.plan.md` — verdict `APPROVE_WITH_CHANGES` (3 findings).

- F1 Rejected: the CLAUDE.md rule is "Do not add comments … to code you did not change" (Code Modification); the `--output` line is new code in `build()`, and `ai/TestCommandBuilder.ts:7` already carries a one-line "why" comment for the `--grep` option, so one line explaining why `--output` is needed matches the file's comment density. It explains a non-obvious cause (Playwright empties its outputDir) that a later reader could otherwise "simplify" away. The plan now limits it to one line without the string `test-results`, so it cannot affect AC3.
- F2 Accepted: Verification step 4 now imports `./ai/TestCommandBuilder.js` and `./config/framework.config.js`, matching the repository's `.js` specifiers (`ai/TestCommandBuilder.ts:1`); tsx maps them to the `.ts` sources. (REQ-004's `.ts` form also worked, so this is a convention fix, not a correctness one.)
- F3 Accepted (partly): the `test-results` grep stays, because AC3 literally requires that neither file contain a hardcoded `test-results` path; a second, positive grep for `frameworkConfig.healingRerunOutputFolder` in `ai/TestCommandBuilder.ts` was added to AC3 Traceability and Verification step 3, proving the folder is read from the config. Step 4 already asserts the built folder starts with `frameworkConfig.healingRerunOutputFolder + "/"`.

## Implementation Notes

Implemented in an interactive session (Q1). Changed: `config/framework.config.ts` (`healingRerunOutputFolder`), `ai/TestCommandBuilder.ts` (`--output="<base>/<randomUUID()>"` + one-line comment), `.claude/rules/self-healing.md` (step 4).

Deviations:
- D1: Verification step 4 imports `./ai/TestCommandBuilder.ts` / `./config/framework.config.ts` (and casts the metadata `as any`): with the `.js` specifiers from F2, `yarn tsx -e` fails with `Cannot find module './ai/TestCommandBuilder.js'` (eval runs as CJS, no `.js` → `.ts` mapping). Same check otherwise; it printed `OK`.
- D2: AC4 broke `TotalComponent.checkoutBtnSel` (`#checkout` → `#checkout-btn`) instead of `BaseItemDetailComponent.addToCartSel`. With `addToCartSel` broken, the AI proposed the right value (`input[id^='add-to-cart-button']`, confidence 95) but the patch was rejected: `Old value not found in component source` — `ComponentFailureCollector` copies the source of the runtime class (`CheapComputerComponent`), while `addToCartSel` is declared in the parent `BaseItemDetailComponent`. Pre-existing limitation of the healing pipeline for inherited locators, not caused by this change (out of scope; worth its own requirement). The file was restored from git.
- D3: E1 broke `TotalComponent.termOfServiceSel` (`#termsofservice-x`, healed in the parent) and `checkoutBtnSel` (`#checkout-broken`, fails in the child) instead of `addToCartSel` + `checkoutBtnSel`, for the same reason as D2. Both selectors are in a Relevant File.

Gates (after the final change):
- `yarn tsc --noEmit` — 0 errors.
- `yarn harness:check-arch` — PASSED; `yarn harness:test` — passed.
- `yarn harness:check-scope` — FAILED only on `implementation-plans/harness-d-evals.md`, an untracked file of the human that existed before this implementation (not touched); the changed files are all in Relevant Files.
- `yarn playwright test --list --config=playwright.config.web.js` — 70 tests in 14 files.
- AC3: `grep -n "test-results" ai/TestCommandBuilder.ts ai/HealingEngine.ts` — no match (exit 1); `grep -n "frameworkConfig.healingRerunOutputFolder" ai/TestCommandBuilder.ts` — line 16 (the `--output` line).
- AC1 / AC2 / E2 (step 4, D1): `OK`; e.g. `… --config=playwright.config.web.js --output="test-results/healing-rerun/dbbe638c-e37b-498c-9787-0a6f44f45ad4"` and a second call with `…/1231dc33-3dec-42cf-be3f-80f08f9b990f`.
- AC5: `.claude/rules/self-healing.md` step 4 shows `--output="<frameworkConfig.healingRerunOutputFolder>/<uuid>"` with the reason.

Tests:
- AC4 (healing on, D2): `yarn playwright test tests/web/Day25/TestCheapComponent.spec.ts --config=playwright.config.web.js --project="Desktop Chromium"` — exit 0, `1 passed (54.6s)`; `Rerunning test: … --output="test-results/healing-rerun/5eea7454-073f-4819-a2ef-213a5041db72"`, `Rerun passed.`, `[HealingEngine] HEALED on attempt 1 | #checkout-btn → #checkout`; no `ENOENT`; `harness-results/summary.json`: `passed`, healing `HEALED`; `test-results/healing-rerun/5eea7454-…/` present. The patch restored the original value; `.bak` deleted.
- E1 (healing on, D3): same command — exit 1; child failed on `#checkout-broken` → `Rerun failed with exit code 1` → `[HealingEngine] Source restored from backup.` → `Max retries (1) exhausted.`; the parent failed with the original `#termsofservice-x` click timeout, no `ENOENT`; summary healing `FAILED`; `TotalComponent.ts` identical to its broken pre-run content. Restored from git, `.bak` deleted.
- `yarn harness:run-tests tests/web/Day25/TestCheapComponent.spec.ts` — 1 passed (23.5s, healing off), `harness-results/tests/2026-11-21T03-14-57-464Z.json` (all component files equal to `HEAD` at the end).

## Human Code Review Notes

## Code Review Resolution

Review: `implementation-review/REQ-005-healing-rerun-output-dir.code.md` — verdict `APPROVE` (0 findings). No code change.

## Commit Message

```text
Implement REQ-005: healing rerun uses its own output folder

- TestCommandBuilder adds --output="<healingRerunOutputFolder>/<uuid>"
  to the rerun command: the child Playwright run emptied the shared
  test-results/ at start and deleted the parent's in-progress trace,
  so every healed test failed at teardown with ENOENT.
- frameworkConfig.healingRerunOutputFolder = test-results/healing-rerun
  (still gitignored and removed by harness:clean).
- .claude/rules/self-healing.md: rerun command with --output.

OpenAI code review: APPROVE, 0 findings. Healed Day25 test passed
(HEALED, no ENOENT); rerun-failure path FAILED with restore; 1 Day25
test passed with healing off.
```

## Relevant Files

- knowledge-base/requirements/REQ-005-healing-rerun-output-dir.md
- ai/TestCommandBuilder.ts
- config/framework.config.ts
- .claude/rules/self-healing.md
- ai/HealingEngine.ts
- ai/TestRerunner.ts
- ai/Metadata.ts
- models/components/BaseItemDetailComponent.ts
- models/components/cart/TotalComponent.ts
- tests/web/Day25/TestCheapComponent.spec.ts
- playwright.config.web.js
- harness/agent/clean.ts
- harness/reporters/summary-reporter.ts
- implementation-plans/harness-c4-agent-execute.md
