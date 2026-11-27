# Implementation Plan: Self-Healing Patches Locators Declared in a Parent Class

Status: Accepted
Requirement: knowledge-base/requirements/REQ-006-heal-inherited-locators.md

## Objective

When a CSS/XPath action fails in `Component.withHealing()`, `ComponentFailureCollector.collect()` resolves the source file of the class that **declares** the failing selector instead of always the runtime class's file. A new `SourceCodeCollector.findDeclaring(className, selectorStr)` starts at the runtime class's file, follows `extends <Name>` through `SourceCodeCollector.find()` (stopping before `Component`) and returns the file of the nearest class whose string property initializers hold the selector, either by equality or as a `dynamic<Name>` template; otherwise the runtime class's file, as today. `component.ts`, `FailureContext.sourceFile` and everything downstream (validator, lock, backup, patch, verify) then point at the declaring file, so `BaseItemDetailComponent.addToCartSel` used through `CheapComputerComponent` can be healed. `models/components/Component.ts` is unchanged (approach (b) of the requirement).

## Acceptance Criteria Traceability

This is a self-healing pipeline requirement: AC1–AC3 and E1–E3 are covered by a one-off resolver script (no browser, no OpenAI; Verification step 4), AC4 by a Playwright run with self-healing on and a local, uncommitted broken locator (it cannot run through `yarn harness:run-tests`, which disables healing), AC5 by review. No spec is added.

| ID | Covered by (spec › flow step) | Assertion |
|---|---|---|
| AC1 | One-off script (Verification step 4): `SourceCodeCollector.findDeclaring("CheapComputerComponent", "input[id^='add-to-cart-button']")`, also `"div.product-price"` and the same two for `StandardComputerComponent` | Each resolves (path relative to cwd) to `models/components/BaseItemDetailComponent.ts` |
| AC2 | Same script: `findDeclaring("CheapComputerComponent", '//label[contains(text(), "Slow")]')` (`optionLabelSel` with `dynamicText` replaced), the `sectionOptionSel` value with `dynamicSection` → `Processor`, `dynamicIndex` → `1`, and `"input[type='checkbox']"` (`allCheckboxSel`) | Each resolves to `models/components/computer/ComputerEssentialComponent.ts` |
| AC3 | Same script: `findDeclaring("TotalComponent", "#checkout")`, `findDeclaring("BillingAddressComponent", "input[value='Continue']")`, `findDeclaring("StandardComputerComponent", <dynamicDropdownSel with dynamicText → Processor>)`, `findDeclaring("ShoppingCartPage", ".order-summary-content")` | Resolve to `models/components/cart/TotalComponent.ts`, `models/components/checkout/BillingAddressComponent.ts`, `models/components/computer/StandardComputerComponent.ts`, `models/pages/ShoppingCartPage.ts` — each equals `SourceCodeCollector.find(<runtime class>)` |
| AC4 | `tests/web/Day25/TestCheapComponent.spec.ts` › `@Regression \| Test Cheap Component`, self-healing on, `BaseItemDetailComponent.addToCartSel` locally broken to `"input[id^='add-to-cart-btn']"` (Verification step 6) | Playwright reports the test passed; `harness-results/summary.json` (written by the config's summary reporter; `run.startedAt` after the command start) test `status` `passed`, healing outcome `HEALED`; console `[HealingEngine] HEALED on attempt 1 \| input[id^='add-to-cart-btn'] → …`; `models/components/BaseItemDetailComponent.ts.bak` exists and `BaseItemDetailComponent.ts` holds the healed value; `git diff --quiet -- models/components/computer/CheapComputerComponent.ts` exits 0; `cmp` of `artifacts/Desktop Chromium/<test>/component.ts` with `BaseItemDetailComponent.ts.bak` (the pre-patch content) exits 0 |
| AC5 | Review of `.claude/rules/self-healing.md`, Failure Context Collection › `ComponentFailureCollector.ts` | The "Copies component source file" bullet names `SourceCodeCollector.findDeclaring(componentClassName, selectorStr)` and describes: walk of the inheritance chain via `extends` (runtime class first, stops before `Component`), equality or `dynamic<Name>` wildcard match, nearest class wins, fallback to the runtime class's file |
| E1 | Same script: `findDeclaring("CheapComputerComponent", "#req006-not-declared")` | Resolves to `models/components/computer/CheapComputerComponent.ts` (the runtime class's file); the healing result downstream is the existing pipeline's (unchanged code) |
| E2 | Same script with two temporary probe files (created and deleted by the script): `models/components/Req006ProbeParentComponent.ts` (`extends Component`, `private aSel = "#req006-dup"`) and `models/components/Req006ProbeChildComponent.ts` (`extends Req006ProbeParentComponent`, `private bSel = "#req006-dup"`) | `findDeclaring("Req006ProbeChildComponent", "#req006-dup")` resolves to `Req006ProbeChildComponent.ts` (nearest), and a selector only in the parent (`private cSel = "#req006-parent-only"`) resolves to `Req006ProbeParentComponent.ts` |
| E3 | Same script: probe `models/components/Req006ProbeOrphanComponent.ts` (`extends Req006MissingComponent`, no such file) and `findDeclaring("Req006NoSuchComponent", "#x")` | Orphan: `findDeclaring("Req006ProbeOrphanComponent", "#req006-anything")` resolves to the orphan's own file, no throw. Unknown runtime class: the promise rejects with `Cannot find source file for component: Req006NoSuchComponent` — the same error `find()` throws today, which `Component.withHealing()` (unchanged) catches as `[Component] Healing engine error` before re-throwing the original action error. The end-to-end "no runner crash" path is Not automated: no real component lacks its file; it relies on the unchanged catch in `Component.withHealing()` |

## Scenarios

1. Resolver checks (AC1–AC3, E1–E3) — one-off script `/tmp/req-006-check.mts` (outside the repo, so `tsc` and `check-scope` never see it), run with `yarn tsx /tmp/req-006-check.mts` from the project root. It dynamically imports `path.resolve("ai/SourceCodeCollector.ts")`, writes the three probe files, runs every case in the Traceability table, compares `path.relative(process.cwd(), result)` to the expected path, deletes the probe files in a `finally`, prints `OK` or the failing cases and exits 0/1. Probe files contain only a class with string fields (no imports besides `Component` for the parent), and are never committed.
2. Healed inherited locator (AC4) — start: clean tree, `yarn harness:clean`, guest context (fresh browser context per test, empty cart). Local change: `addToCartSel` in `models/components/BaseItemDetailComponent.ts` → `"input[id^='add-to-cart-btn']"`. Run the spec with healing on. Expected: add-to-cart click fails inside `withHealing()` (runtime class `CheapComputerComponent`) → collector resolves `BaseItemDetailComponent.ts`, copies it as `component.ts` → AI returns a `LOCATOR` patch for `addToCartSel` → validator accepts it against `BaseItemDetailComponent.ts` → `.bak` + patch in that file → rerun child passes → `HEALED` → `SelfHealingSuccess` swallowed by `base.ts` → test passed. Afterwards `git checkout -- models/components/BaseItemDetailComponent.ts` and delete the `.bak`.

## Reuse

- `SourceCodeCollector.find(componentName)` and its private `scan()` / `componentCache` in `ai/SourceCodeCollector.ts` — unchanged; `findDeclaring()` resolves every class of the chain through `find()` (one class per file, file name = class name).
- `Component.withHealing()` in `models/components/Component.ts` — unchanged; it still passes `componentClassName: this.constructor.name` and catches any collector error as `[Component] Healing engine error`.
- `ComponentCollectorParams` (`page`, `componentLocator`, `testInfo`, `componentClassName`) — unchanged.
- `HealingEngine.handle()`, `AIResponseValidator.validate()`, `HealingLock`, `BackupManager`, `PatchApplier`, `PatchVerifier`, `TestCommandBuilder`, `TestRerunner` — unchanged; they already use `context.sourceFile`.
- `AssertionFailureCollector` / `StackTraceParser` — unchanged (out of scope).
- `typescript` (already in `dependencies` of `package.json`, installed in the Docker image by `yarn install --immutable`) — its parser (`ts.createSourceFile`) reads class declarations, `extends` clauses and string initializers; no new dependency.
- `tests/web/Day25/TestCheapComponent.spec.ts`, `OrderTestFlow`, `BaseItemDetailComponent.addToCartSel` (`withHealing(this.addToCartSel, l => l.click())`) — used as they are for AC4; the broken selector is local and never committed.
- `harness/reporters/summary-reporter.ts` — unchanged; gives the healing outcome for AC4.

## Changes by Layer

### Spec
- None.

### TestFlow
- None.

### Page Object
- None.

### Component
- None (`models/components/Component.ts` unchanged, per the requirement's decided approach (b)).

### Test Data
- None.

### Config
- None.

### Self-healing pipeline
- `ai/SourceCodeCollector.ts` — new `public static async findDeclaring(componentName: string, selectorStr: string): Promise<string>`:
  1. `const runtimeFile = this.find(componentName)` — throws `Cannot find source file for component: …` as today when the runtime class has no file (E3).
  2. `const ts = (await import("typescript")).default` — lazy, so workers load the TypeScript parser only on a healing failure, never on a passing run.
  3. Walk: `name = componentName`, `visited = new Set()`; while `name && name !== "Component" && !visited.has(name)`: `file = this.find(name)` inside `try` (on error: stop the walk — the class is skipped and its ancestors cannot be reached, E3); parse with `ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)`; take the `ClassDeclaration` whose `name.text === name`; if one of its `PropertyDeclaration`s (instance or static) has a `StringLiteral` / `NoSubstitutionTemplateLiteral` initializer whose `.text` matches `selectorStr`, return `file` (nearest wins, E2); else `name` = the identifier of its `extends` heritage clause (type arguments ignored), or stop when there is none.
  4. Return `runtimeFile` (E1).
  - Private `matchesSelector(value: string, selectorStr: string): boolean`: `value === selectorStr`, or, when `value` contains placeholder tokens (`/\bdynamic[A-Z][A-Za-z0-9]*\b/g`, the same pattern as `AIResponseValidator`), a regex built from `value` with the literal parts escaped and each token replaced by `[\s\S]*`, anchored `^…$`, tests `selectorStr`.
  - Only property initializers count, not every string literal in the file: `.replace('dynamicText', type)` in a method body is itself a bare token literal and would match any selector (it would make `ComputerEssentialComponent` win AC1 wrongly). `.text` gives the unescaped value, so `"//label[contains(text(), \"dynamicText\")]"` matches the runtime `//label[contains(text(), "Slow")]` (AC2).
  - No new cache: the method runs only on a failure; `find()` keeps its own cache.
- `ai/collectors/ComponentFailureCollector.ts` — `const sourceFile = SourceCodeCollector.find(componentClassName);` becomes `const sourceFile = await SourceCodeCollector.findDeclaring(componentClassName, selectorStr);`; the comment above it becomes `// Locate and copy the source file of the class that declares the failing selector`. `FailedLocatorManager.set(selectorStr)` stays first; artifact collection order unchanged. `sourceFile` already flows into `FailureContext.sourceFile`.

### Docs
- `.claude/rules/self-healing.md`, Failure Context Collection › `ai/collectors/ComponentFailureCollector.ts`: the bullet "Copies component source file via `SourceCodeCollector.find(componentClassName)`" becomes "Copies the source file of the class that declares the failing selector via `SourceCodeCollector.findDeclaring(componentClassName, selectorStr)`", with sub-bullets: starts at the runtime class's file and follows `extends <Name>` through `find()` (stops before `Component`); a class matches when one of its string property initializers equals the selector or, as a `dynamic<Name>` template (each token a wildcard), matches it; the nearest class wins; a class whose file is missing ends the walk; no match → the runtime class's file (as before). The file it returns is `FailureContext.sourceFile`, used by the validator, lock, backup and patch.

## Out of Scope

- `AssertionFailureCollector` / `StackTraceParser` (assertion entry point).
- AI prompt, `FailureAnalysisPrompt`, analysis model, `AIResponseValidator` rules, `HealingLock` timeout, `HealingEngine` flow and outcomes.
- `models/components/Component.ts` (approach (a) rejected by the human).
- Selectors built with a template literal or inline in a method.
- Sending several classes' sources in one `component.ts`.
- REQ-005's rerun output folder.
- A permanent regression check of `findDeclaring()` in `yarn harness:test` (needs a `package.json` script change; see Q2).

## Risks

- A patch to a parent class changes the locator for every subclass (e.g. `BaseItemDetailComponent` for both computer components, `FooterColumnComponent` for its four column subclasses). Intended by the requirement; it still changes only the failed locator.
- `extends` names are resolved by file name through `find()`; a default import aliased to another name (`import X from "./Y.js"`) would not resolve and would end the walk (fallback to the runtime file, same as today). All current classes import their parent under its own name (checked with a grep over `models/`).
- Wildcard templates are permissive: an unrelated selector of the same class shape could match a parent's template while the runtime class declares nothing. Nearest-first and the property-initializer restriction limit it; the validator still checks `field` / `oldValue` in the chosen file, so a wrong pick ends `FAILED` as today, never a wrong patch.
- `import("typescript")` adds a parse (~ hundreds of ms) to the failure path only; well inside the healing timeout extension (60 s).
- AC4 depends on OpenAI: the AI may return `MANUAL` or confidence < 80. REQ-005 (D2) got `input[id^='add-to-cart-button']` with confidence 95 for this exact break; if it does not patch, try another typo of `addToCartSel` (at most twice), else record AC4 as manual evidence (requirement Notes). No credits (`429`) → AC4 recorded as not verified.
- The probe files exist in `models/components/` only while the script runs; the `finally` removes them. If the script is killed, delete them by hand before running `tsc` / `check-scope`.

## Open Questions

- Q1: Who implements the plan? `ai/` is a guarded pipeline path and `.claude/rules/` is outside what `/implement-plan` edits, so a headless `yarn agent:implement` would likely stop `Blocked`. Plan: Claude implements it in an interactive session (as REQ-005, per the requirement's Notes), then `yarn ai:review --mode code`.
  → A: As planned (2026-11-23).
- Q2: Add a permanent check of `findDeclaring()` (AC1–AC3, E1–E3) to `yarn harness:test`? It needs a `package.json` script change, outside the requirement. Plan: one-off `/tmp/req-006-check.mts` only, output recorded in Implementation Notes.
  → A: As planned (2026-11-23).
- Q3: AC4 spends OpenAI credits (one analysis call, possibly up to three if the typo has to be changed). May the implementer run it during implementation without asking again? Plan: yes, one run with the typo above.
  → A: As planned (2026-11-23).

## Human Review Notes

## Verification

1. `yarn tsc --noEmit` — zero errors.
2. `yarn harness:check-arch ai/SourceCodeCollector.ts ai/collectors/ComponentFailureCollector.ts` and `yarn harness:test` — pass.
3. `grep -n "findDeclaring" ai/collectors/ComponentFailureCollector.ts` — one match; `grep -n "SourceCodeCollector.find(" ai/collectors/ComponentFailureCollector.ts` — no match; `git diff --quiet -- models/components/Component.ts` — exit 0.
4. AC1–AC3, E1–E3: `yarn tsx /tmp/req-006-check.mts` (Scenario 1) — prints `OK`, exit 0; afterwards `ls models/components/Req006Probe*` finds nothing.
5. `yarn playwright test --list --config=playwright.config.web.js` — specs and data load. `yarn harness:run-tests tests/web/Day25/TestCheapComponent.spec.ts` — passes (healing off; normal runs unaffected; this is the cited test result).
6. AC4 (healing on, OpenAI credits, Q3): clean tree; set `addToCartSel` to `"input[id^='add-to-cart-btn']"` (uncommitted); `yarn harness:clean`; `yarn playwright test tests/web/Day25/TestCheapComponent.spec.ts --config=playwright.config.web.js --project="Desktop Chromium"` (not `yarn agent:execute`, which refuses a modified tracked file; no `--reporter` flag, so the config's reporters — incl. `./harness/reporters/summary-reporter.ts`, `playwright.config.web.js` `reporter` — write `harness-results/summary.json`, which `harness:clean` never removes). Check: test passed; `harness-results/summary.json` `run.startedAt` is later than the command's start time (summary from this run, not an older one) and `run.dirtyAtStart` lists `models/components/BaseItemDetailComponent.ts`; test `passed` + healing `HEALED`; `HEALED on attempt 1` line; `models/components/BaseItemDetailComponent.ts.bak` exists; `git diff --quiet -- models/components/computer/CheapComputerComponent.ts` exit 0; `cmp "artifacts/Desktop Chromium/<test>/component.ts" models/components/BaseItemDetailComponent.ts.bak` exit 0. Then `git checkout -- models/components/BaseItemDetailComponent.ts` and delete the `.bak`.
7. AC5: read the updated bullet in `.claude/rules/self-healing.md`.
8. `git status` — only the plan's Relevant Files changed; `yarn harness:check-scope implementation-plans/REQ-006-heal-inherited-locators.md`.

The last result file cited in Implementation Notes must be the passing step 5 `harness:run-tests` run.

## Review Resolution

OpenAI plan review: `implementation-review/REQ-006-heal-inherited-locators.plan.md` (`.plan.json`), verdict `APPROVE_WITH_CHANGES`, 1 finding.

- F1 Rejected: the premise is wrong — `playwright.config.web.js` (`reporter`, lines 47–51) always registers `./harness/reporters/summary-reporter.ts`, and step 6's command passes `--config=playwright.config.web.js` with no `--reporter` override, so `harness-results/summary.json` is written deterministically (the reporter skips only a healing rerun child, `HEALING_RERUN=true`, and `--list`; `summary-reporter.ts` `onEnd()` / `enabled()`; CLAUDE.md › Debugging: "Every web run with the config reporters writes `harness-results/summary.json`"). `yarn agent:execute` is not usable for AC4: it refuses a modified tracked file, and the broken locator must be a local edit. The finding's underlying concern (a stale summary) is still addressed: AC4 row and Verification step 6 now state which reporter writes the file and check `run.startedAt` is later than the command's start and `run.dirtyAtStart` lists `models/components/BaseItemDetailComponent.ts`, since `harness:clean` does not remove `harness-results/`.

## Implementation Notes

Implemented in an interactive session (Q1). Changed: `ai/SourceCodeCollector.ts` (`findDeclaring()` + private `matchesSelector()`), `ai/collectors/ComponentFailureCollector.ts` (`await SourceCodeCollector.findDeclaring(componentClassName, selectorStr)` + comment), `.claude/rules/self-healing.md` (Failure Context Collection bullet). `models/components/Component.ts` unchanged.

Deviations:
- D1: The one-off resolver script lives in the session scratchpad (`…/scratchpad/req-006-check.mts`) instead of `/tmp/req-006-check.mts` (session rule: temporary files go to the scratchpad). Still outside the repo; run with `yarn tsx <path>` from the project root; content as Scenario 1.
- D2: `findDeclaring()` also ends the walk when a file has no class declaration with the expected name (`break`), same handling as a missing file; not spelled out in the plan, needed to avoid an endless or wrong walk.

Gates (after the final change):
- `yarn tsc --noEmit` — 0 errors.
- `yarn harness:check-arch ai/SourceCodeCollector.ts ai/collectors/ComponentFailureCollector.ts` — PASSED; `yarn harness:test` — passed.
- `yarn harness:check-scope implementation-plans/REQ-006-heal-inherited-locators.md` — PASSED (3 changed files).
- `yarn playwright test --list --config=playwright.config.web.js` — 70 tests in 14 files.
- Step 3: `findDeclaring` at `ai/collectors/ComponentFailureCollector.ts:46`; `SourceCodeCollector.find(` no match (exit 1); `git diff --quiet -- models/components/Component.ts` exit 0.
- AC1–AC3, E1–E3 (step 4, D1): 16 cases `ok`, `OK`, exit 0 — AC1 ×4 → `BaseItemDetailComponent.ts`; AC2 ×3 (`optionLabelSel` with "Slow", `sectionOptionSel` with Processor/1, `allCheckboxSel`) → `ComputerEssentialComponent.ts`; AC3 ×4 → own files (`TotalComponent`, `BillingAddressComponent`, `StandardComputerComponent` `dynamicDropdownSel`, `ShoppingCartPage`); E1 → `CheapComputerComponent.ts`; E2 nearest child / parent-only parent; E3 orphan → own file, unknown class rejects with `Cannot find source file for component: Req006NoSuchComponent`. Probe files removed (`ls models/components/Req006Probe*` finds nothing).
- AC5: `.claude/rules/self-healing.md` bullet names `SourceCodeCollector.findDeclaring(componentClassName, selectorStr)` with the walk, match, nearest-wins and fallback rules.

Tests:
- AC4 (healing on, OpenAI): `addToCartSel` → `"input[id^='add-to-cart-btn']"` (local); `yarn harness:clean`; command start 2026-11-23T02:46:50Z; `yarn playwright test tests/web/Day25/TestCheapComponent.spec.ts --config=playwright.config.web.js --project="Desktop Chromium"` — exit 0, `1 passed (54.1s)`; `[HealingEngine] HEALED on attempt 1 | input[id^='add-to-cart-btn'] → input.add-to-cart-button` (confidence 90); rerun child with its own `--output` passed. `harness-results/summary.json`: `run.startedAt` 2026-11-23T02:46:51.188Z, `run.dirtyAtStart` lists `models/components/BaseItemDetailComponent.ts`, test `passed`, healing `HEALED`. `BaseItemDetailComponent.ts.bak` existed and `BaseItemDetailComponent.ts` held `input.add-to-cart-button`; `CheapComputerComponent.ts` unchanged (`git diff --quiet` exit 0); `cmp` of `artifacts/Desktop Chromium/_Regression_Test_Cheap_Component/component.ts` with the `.bak` exit 0. Afterwards restored from git and `.bak` deleted.
- `yarn harness:run-tests tests/web/Day25/TestCheapComponent.spec.ts` — 1 passed (healing off), `harness-results/tests/2026-11-23T02-46-16-417Z.json` (all component files equal to `HEAD` at the end).

## Human Code Review Notes

## Code Review Resolution

Review: `implementation-review/REQ-006-heal-inherited-locators.code.md` — verdict `APPROVE` (0 findings). No code change.

## Commit Message

```text
Implement REQ-006: heal locators declared in a parent class

- SourceCodeCollector.findDeclaring(): walks the inheritance chain from
  the runtime class via `extends` (TypeScript parser, loaded lazily)
  and returns the file of the nearest class whose string field equals
  the failing selector or matches it as a dynamic<Name> template;
  falls back to the runtime class's file.
- ComponentFailureCollector uses it, so component.ts, the validator,
  lock, backup and patch target the declaring file. Before, a parent
  class locator always failed with "Old value not found".
- .claude/rules/self-healing.md: source file resolution.

OpenAI code review: APPROVE, 0 findings. Resolver checks 16/16 OK;
broken BaseItemDetailComponent.addToCartSel healed (HEALED, passed);
1 Day25 test passed with healing off.
```

## Relevant Files

- knowledge-base/requirements/REQ-006-heal-inherited-locators.md
- ai/SourceCodeCollector.ts
- ai/collectors/ComponentFailureCollector.ts
- .claude/rules/self-healing.md
- models/components/Component.ts
- ai/AIResponseValidator.ts
- ai/HealingEngine.ts
- models/ai/FailureContext.ts
- models/components/BaseItemDetailComponent.ts
- models/components/computer/ComputerEssentialComponent.ts
- models/components/computer/CheapComputerComponent.ts
- models/components/computer/StandardComputerComponent.ts
- models/components/cart/TotalComponent.ts
- models/components/checkout/CheckoutStepComponent.ts
- models/components/checkout/BillingAddressComponent.ts
- models/components/global/footer/FooterColumnComponent.ts
- models/pages/BasePage.ts
- models/pages/ShoppingCartPage.ts
- tests/web/Day25/TestCheapComponent.spec.ts
- playwright.config.web.js
- harness/reporters/summary-reporter.ts
- package.json
- Dockerfile
- implementation-plans/REQ-005-healing-rerun-output-dir.md
