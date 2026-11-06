# Implementation Plan: Anchor the Healing Rerun `--grep`

## Objective

The rerun command built by `ai/TestCommandBuilder.ts` must select only the test that was healed.

---

## Problem

```ts
const parts = metadata.testName.split("|");
const testcaseName = (parts[1] ?? parts[0]).trim();      // "Test Standard Component"
command += ` --grep="${this.escapeRegex(testcaseName)}"`;
```

The tag prefix is dropped and the regex is not anchored, so `Test Standard Component` also matches
`Test Standard Component With Login`. In the skill trial (B2) the healing rerun ran 2 tests.
If the unrelated test fails, `TestRerunner` rejects, `BackupManager.restore()` rolls back a correct
patch and healing ends `FAILED`.

## Evidence (`--list`, Desktop Chromium)

| `--grep` | Matches |
|---|---|
| `Test Standard Component` (current) | 2 |
| `Test Standard Component$` | 1 |
| `@Smoke \| Test Standard Component$` (full title, anchored) | 1 |
| spec file + grep | 1 |
| `spec.ts:11` (line filter) | 0 — test location is `tests/fixtures/base.ts:113` because of the wrapper |

---

## Change

`ai/TestCommandBuilder.ts`: grep on the full escaped title with an end anchor; drop the `split("|")`.

```ts
command += ` --grep="${this.escapeRegex(metadata.testName.trim())}$"`;
```

`.claude/rules/self-healing.md`: update the `TestCommandBuilder.build(metadata)` command line to match.

No change to lock, backup, verify, `HEALING_RERUN` guard, confidence gate or `HealingEngine` flow.

---

## Out of Scope (known limits)

1. Identical titles in different files (`Test Footer Flow` in Day23/Day24, `Advance POM - Component in page`
   in Day22) still match together. A full fix passes the spec path (`testInfo.titlePath[0]` + `testDir`),
   which touches `Metadata.ts` and both collectors.
2. Tags declared via `{ tag: ... }` (not used in this project) need re-checking against the anchor.
3. Pre-existing: titles containing `"`, `` ` `` or `$` can break the shell command in `exec`; the command
   always uses `--config=playwright.config.web.js`.

---

## Verification

1. Typecheck clean.
2. `--list` with the command `build()` produces for `@Smoke | Test Standard Component` → 1 test.
3. Repeat skill-trial B2 (break `checkoutBtnSel`, healing on, OpenAI): the rerun reports 1 passed.
   Then `git restore` and remove the `.bak`.
4. Commit on `main`; push only when asked.

---

## Relevant Files

- ai/TestCommandBuilder.ts
- ai/TestRerunner.ts
- ai/Metadata.ts
- ai/HealingEngine.ts
- .claude/rules/self-healing.md
- tests/fixtures/base.ts
