# REQ-005: Healing Rerun Uses Its Own Output Folder

## Metadata
- ID: REQ-005
- Area: self-healing
- Source: manual
- Author: Claude

## Goal
When `HealingEngine` patches a locator, it verifies the patch by rerunning the test in a child process (`TestCommandBuilder.build()` → `TestRerunner.run()`). The rerun command passes no `--output`, so the child uses the same `outputDir` (`test-results/`) as the parent run. Playwright empties its output folder when it starts, so the child deletes the parent's temporary trace files under `test-results/.playwright-artifacts-<n>/` while the parent test is still running. When the parent test ends, Playwright reads those files to build the trace (`trace: 'retain-on-failure'`), gets `ENOENT … .trace` in the teardown, and marks the test failed. Every successfully healed test is therefore reported `failed` (with healing outcome `HEALED` in `harness-results/summary.json`), and `yarn agent:execute` counts it as a failure. The rerun must write its output to its own folder so a healed test ends as passed.

## Scope
### In Scope
- `config/framework.config.ts` gains the base folder for healing rerun output (under `test-results/`), so the path is not hardcoded (self-healing rule: all artifact paths come from the framework config).
- `ai/TestCommandBuilder.ts` adds `--output=<base folder>/<unique id>` to the rerun command; the id is unique per rerun, because `HealingLock` locks per source file and two workers may rerun at the same time.
- `.claude/rules/self-healing.md` describes the new rerun command.

### Out of Scope
- Reporters of the child process (`html` overwrites `playwright-report/` mid-run, `allure-playwright` adds a second result for the rerun test); a separate requirement if needed.
- Any other change to the `HealingEngine` flow: guards, `HealingLock`, `BackupManager`, `PatchApplier`, `PatchVerifier`, `TestRerunner` and the `HEALING_RERUN=true` env stay unchanged.
- The `--grep`, `--project`, `--headed` and `--config` options of the rerun command.
- Trace / video / screenshot settings in `playwright.config.web.js`, `playwright.config.android.js` and CI workflows.

## Preconditions
- Self-healing enabled (no `SELF_HEALING_DISABLED=true`) and `OPEN_API_KEY` with credits, for the end-to-end check.
- A Day25 spec whose CSS locator is deliberately broken on a scratch branch (not committed), so the AI can return a `LOCATOR` patch.

## Actors
- `HealingEngine` (parent test process) and the healing rerun child process.
- `yarn agent:execute` / a human running Playwright with healing on.

## User Flow
1. A test runs with self-healing on; a CSS locator fails inside `withHealing()`.
2. `HealingEngine` patches the source and builds the rerun command with its own `--output` folder.
3. The child process empties and uses only that folder; the parent's `test-results/` files stay intact.
4. The child passes; `HealingEngine` returns `HEALED`; the parent test body ends without error.
5. Playwright finalizes the parent's trace without error, and the test is reported as passed.

## Acceptance Criteria
- [ ] AC1: `TestCommandBuilder.build()` returns a command containing `--output=` with a folder under the healing rerun base folder from `frameworkConfig`; the other options are unchanged.
- [ ] AC2: Two consecutive `TestCommandBuilder.build()` calls with the same metadata return different `--output` folders.
- [ ] AC3: Neither `ai/TestCommandBuilder.ts` nor `ai/HealingEngine.ts` contains a hardcoded `test-results` path.
- [ ] AC4: A run with a deliberately broken Day25 CSS locator that the AI heals ends with the test passed, no `ENOENT` error, healing outcome `HEALED` in `harness-results/summary.json`, and the child's output under the healing rerun base folder.
- [ ] AC5: `.claude/rules/self-healing.md` shows the rerun command with `--output`.

## Expected Results
- A healed test is reported as passed in the Playwright output, the HTML report and `summary.json`.
- The parent run's trace, video and screenshot files are not deleted by the rerun.
- `yarn harness:clean` still removes the rerun output (it is inside `test-results/`), and it stays gitignored.

## Error Cases
- E1: When the rerun fails, `HealingEngine` still restores the `.bak` and returns `FAILED` (behaviour unchanged), and the parent test fails with its original error, not with `ENOENT`.
- E2: When two workers heal different source files at the same time, each rerun writes to its own folder and neither deletes the other's or the parent's files.

## Test Data
- None (uses an existing Day25 spec; the broken locator is a local, uncommitted change).

## Notes
- The cause predates Slice C: `TestCommandBuilder` never passed `--output`; it became visible because `agent:execute` is the first stage that runs with healing on and compares the healing outcome with the test status. `harness:run-tests` disables healing, so agent runs never spawned a rerun.
- AC4 and E1 need OpenAI credits and cannot run through `yarn harness:run-tests` (healing off); they are verified with a Playwright run with healing on (or `yarn agent:execute --spec <file>`), and recorded as manual evidence if credits are unavailable.
- Files under `ai/` and `config/framework.config.ts` are self-healing pipeline files: the PreToolUse guard asks before editing them, so a headless `/implement-plan` may stop `Blocked`; implement it in an interactive session in that case.
