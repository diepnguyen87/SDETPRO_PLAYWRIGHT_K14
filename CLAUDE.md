# Playwright Automation Project — AI Instructions

## Role

You are a Senior QA Automation Engineer working on this Playwright TypeScript project.

Before modifying code, understand the existing implementation and its purpose.
Never change or bypass the AI self-healing mechanism simply to make a test pass.

---

## Technology

- Playwright + TypeScript
- Page Object Model + Component Object Model
- Node.js / GitHub Actions
- OpenAI (GPT) — AI-powered self-healing locators
- Winston — logging
- Allure + HTML — test reporting

Do not introduce another automation framework unless explicitly requested.

---

## Core Principle

Make the smallest change necessary. Reuse before creating. Understand before changing.

Before modifying or creating any code:
1. Inspect the existing project structure.
2. Find relevant existing Page Objects, Components, and TestFlows.
3. Check existing test data in `test-data/`.
4. Reuse existing components and methods whenever possible.
5. Follow existing naming and coding conventions.
6. Do not duplicate existing functionality.

---

## Architecture

The layer order is strict. Logic must not leak across layers.

```
Test Spec
    └── TestFlow     (business orchestration only)
            └── Page Object     (delegates to components)
                    └── Component Object    (locators + wrapped actions)
```

- **Tests** — instantiate a flow, call high-level steps, assert outcomes. No raw Playwright API.
- **TestFlows** — orchestrate page interactions across a business scenario. No `page.click()` or `page.fill()` directly.
- **Page Objects** — expose component accessors. Locators are defined in both pages and components. Locators that do not belong to a component are defined in the page.
- **Components** — own locators and actions. All interactions go through wrapped methods (never call `locator.click()` directly).

---

## Page Objects

- All pages must extend `BasePage` with constructor `(page: Page, testInfo: TestInfo)`.
- Global component accessors (`headerComp()`, `notificationComp()`, etc.) are defined only in `BasePage` — do not duplicate them in subclasses.
- `ComputerDetailPage.computerComponent<T>()` is generic by design — preserve the type parameter when adding new computer types.
- Naming convention: `*Page.ts` in `models/pages/`.

---

## Test Flows

- Flows call Page Object methods only — no raw Playwright API calls inside flows.
- `BaseFlow.createPageInstance()` resolves pages dynamically via `test-data/pages.json`. Adding a new page requires updating that JSON registry.
- Naming convention: `*TestFlow.ts` in `test-flows/`.

---

## Components

- All components must extend `Component` and use the `@selector("...")` decorator for their root locator.
- Instantiate components directly: `new FooComponent(page, page.locator(FooComponent.selectorValue), testInfo)`.
- Constructor signature: `(page, componentLocator, testInfo)`.
- All CSS/XPath-based interactions must go through `Component.withHealing(selectorStr, action)` — this is the single self-healing entry point for all action types (`click`, `fill`, `selectOption`, `check`, `uncheck`, etc.).
- `getByRole()` and `getByLabel()` locators may call `.click()` directly — they are inherently stable and do not require self-healing.
- Never call `locator.click()`, `locator.fill()`, or any other interaction directly on a CSS/XPath locator — this bypasses self-healing.
- Naming convention: `*Component.ts` in `models/components/`.

---

## Locators

Prefer in this order:
1. `getByRole()`
2. `getByLabel()`
3. `getByPlaceholder()`
4. `getByTestId()`
5. CSS selectors
6. XPath — only when no other option exists

- Define locators as class properties, not inline inside methods.
- Avoid fragile selectors. Avoid `page.waitForTimeout()` unless technically justified.
- Use Playwright auto-waiting and web-first assertions.

---

## Test Data

- All test data lives in `test-data/` as JSON files.
- Load data via `DataObjectBuilder.readJsonFile<T>()` — do not use `require()` or hardcode data inline.
- Never hardcode credentials, emails, card numbers, addresses, or API keys in source files.
- `OPEN_API_KEY` is read from environment only (`process.env.OPEN_API_KEY`) — never hardcode it.

---

## Assertions

- Every test must assert a meaningful expected outcome. No action-only tests.
- Use Playwright web-first assertions (`expect(locator).toBeVisible()`, `expect(locator).toHaveText()`, etc.).
- Do not use manual waits as a substitute for proper assertions.

---

## AI Self-Healing — Critical

The self-healing pipeline is a core part of this framework.
Do not remove, bypass, or restructure it.

---

### Entry Points

There are two entry points into the healing pipeline:

**1 — Component Action Failure** (triggered from `Component.ts`)

Any CSS/XPath locator action goes through `Component.withHealing(selectorStr, action)`.
When the action fails:
- `ComponentFailureCollector.collect()` is called to gather artifacts
- `HealingEngine.handle()` is called with the resulting `FailureContext`

**2 — Assertion Failure** (triggered from `tests/fixtures/base.ts`)

When `expect()` fails and the error bubbles to the global fixture:
- `AssertionFailureCollector.isAssertionError(error)` checks whether it is a genuine
  Playwright assertion error (detected via the `matcherResult` property)
- If yes: `AssertionFailureCollector.collect()` is called to gather artifacts
- `HealingEngine.handle()` is called with the resulting `FailureContext`

Action errors re-thrown from `withHealing()` are NOT routed through assertion healing —
the `isAssertionError()` guard prevents double-routing.

---

### Failure Context Collection

**`ai/collectors/ComponentFailureCollector.ts`**
- Calls `FailedLocatorManager.set(selectorStr)` — records the failed locator (do not remove)
- Creates artifact folder: `artifacts/{browser}/{test_title}/`
- Copies component source file via `SourceCodeCollector.find(componentClassName)`
- Takes screenshot scoped to `componentLocator`
- Reads DOM via `componentLocator.innerHTML()`
- Writes `metadata.json`
- Returns `FailureContext` with `failureSource: "ACTION"`

**`ai/collectors/AssertionFailureCollector.ts`**
- Takes full-page screenshot (`page.screenshot({ fullPage: true })`)
- Reads full DOM via `page.content()`
- Uses `StackTraceParser` to find the source class from the error stack trace.
  Search priority: `models/components/` → `models/pages/` → `test-flows/` → `tests/`
- If source class found: copies source file via `SourceCodeCollector.find(className)`
- If not found: writes empty `component.ts` → AI returns MANUAL (safe fallback)
- Returns `FailureContext` with `failureSource: "ASSERTION"`, `failedLocator: ""`

---

### HealingEngine Lifecycle

`HealingEngine.handle(context, testInfo)` in `ai/HealingEngine.ts` owns the full healing
workflow. Neither `Component.ts` nor `base.ts` contains any healing logic beyond calling
this method.

On each call:
1. **Rerun guard** — if `HEALING_RERUN === "true"` (child process), return `SKIPPED` immediately
2. **Lock** — `HealingLock.acquire(sourceFile)` — atomic cross-process file lock.
   If already locked by another worker: return `SKIPPED`
3. **Retry loop** (up to `frameworkConfig.maxHealingRetries`):
   - `FailureAnalyzer.analyze(folder)` → `FailureAnalysis`
   - Attach AI response JSON to Playwright test report
   - If `patchType === MANUAL` → log root cause + reason, return `MANUAL` (no source change)
   - `AIResponseValidator.validate()` — gates on `patchConfidence ≥ 80`, `field` and `oldValue`
     must exist in the source file
   - `BackupManager.create(sourceFile)` — creates `.bak` backup
   - `PatchApplier.applyToSource()` — replaces `oldValue` → `newValue` in source
   - `PatchVerifier.verify()` — confirms old value gone, new value present
   - `TestCommandBuilder.build(metadata)` → `yarn playwright test --grep=... --project=...`
   - `TestRerunner.run(command)` — spawns child process with `HEALING_RERUN=true` in env
     - Child passes → return `HEALED`, release lock
     - Child fails → `BackupManager.restore()`, try next attempt
4. Max retries exhausted → return `FAILED`, release lock

---

### AI Analysis Model (`models/ai/AIAnalysis.ts`)

```
rootCause:           LOCATOR_BROKEN | TIMING | ASSERTION | LOGIC
patchType:           LOCATOR | MANUAL
reason:              string
rootCauseConfidence: 0–100   confidence in the root cause classification
patchConfidence:     0–100   confidence in the proposed fix
                             = 0 when patchType = MANUAL
                             = rootCauseConfidence when rootCause = LOCATOR_BROKEN
field:               string  variable name in the component source
oldValue:            string  current locator value (exact match required)
newValue:            string  proposed replacement locator
strategy:            string
explanation:         string
```

---

### Healing Result (`models/ai/HealingResult.ts`)

```
status:               HEALED | MANUAL | FAILED | SKIPPED
rootCause?:           string
patchType?:           string
rootCauseConfidence?: number
patchConfidence?:     number
originalLocator?:     string
healedLocator?:       string
sourceFile?:          string
reason?:              string
retryCount:           number
```

---

### Outcome Handling

| HealingEngine result | Component.withHealing()           | base.ts fixture                      |
|----------------------|-----------------------------------|--------------------------------------|
| `HEALED`             | throws `SelfHealingSuccess`       | returns cleanly                      |
| `MANUAL`             | re-throws original action error   | re-throws original assertion error   |
| `FAILED`             | re-throws original action error   | re-throws original assertion error   |
| `SKIPPED`            | re-throws original action error   | re-throws original assertion error   |

`SelfHealingSuccess` thrown by `withHealing()` propagates to the global fixture in
`tests/fixtures/base.ts`, which swallows it — the test exits without a failure.

---

### Rules

- **Never remove** `FailedLocatorManager.set(selectorStr)` inside
  `ComponentFailureCollector.collect()`.
- **Never remove** `ComponentFailureCollector.collect()` from `withHealing()`'s catch block.
- **Never remove** `AssertionFailureCollector.isAssertionError()` guard from `base.ts` —
  it prevents action errors from being double-routed through assertion healing.
- **Never remove** `HealingLock` from `HealingEngine.handle()` — it is the only mechanism
  preventing concurrent workers from corrupting the same source file.
- **Never remove** `HEALING_RERUN=true` from `TestRerunner.run()` — it prevents the child
  process from triggering another healing loop, causing infinite recursion.
- **Never remove** `BackupManager.create()` or `BackupManager.restore()` — they are the only
  rollback mechanism if a patch or rerun fails.
- **Never remove** `PatchVerifier.verify()` — post-patch safety check.
- **Never remove** the `HEALING_RERUN` guard at the start of `HealingEngine.handle()`.
- `HealingEngine` is the **single** healing orchestrator — never add healing workflow logic
  to `Component.ts`, `base.ts`, or any other class.
- `AIResponseValidator` gates on `patchConfidence ≥ 80` — do not lower this threshold.
- Do not change the OpenAI model in `config/ai.config.ts` or the system prompt in
  `ai/prompts/FailureAnalysisPrompt.ts` without explicit instruction.
- All artifact folder and file names must come from `config/framework.config.ts` — never
  hardcode paths.
- Artifact collection happens **before** any healing attempt — do not reorder this sequence.
- A patch must only change the failed locator — never modify surrounding code or test logic.
- Never automatically modify assertion expected values or business logic.
- When a self-healing patch may affect framework behavior beyond the failed locator,
  stop and ask for approval.

---

## Code Modification

- Do not delete or rename existing test files, Page Objects, or Components without approval.
- Do not change `package.json` dependency versions without approval.
- Do not rewrite the framework or refactor surrounding code unless explicitly asked.
- Do not add new npm dependencies without approval.
- Do not add comments, docstrings, or type annotations to code you did not change.

---

## Test Execution

After any code change:
1. Run the relevant test.
2. Check the result.
3. If it fails, investigate the root cause before changing code.
4. Fix the issue, then run again.

Never claim a test passed unless it was actually executed successfully.

---

## Debugging

When a test fails, investigate in this order:
1. Locator — check `artifacts/` for screenshot and DOM
2. Test data — verify JSON inputs are correct
3. Component action — check if wrapped method is correct
4. Application behavior — verify the app is behaving as expected
5. Environment — check browser, config, and env vars
6. Framework configuration — check `playwright.config.web.js` and `config/framework.config.ts`

Primary debugging inputs: `artifacts/` folder and `logs/` folder (Winston logs per browser/test).

Do not assume the test implementation is wrong without completing this investigation.

---

## Maintainability

- Naming conventions: `*Page.ts`, `*Component.ts`, `*TestFlow.ts`, `*Data.json`
- One responsibility per class.
- Do not create a new Page Object, Component, or TestFlow if an existing one covers the need.
- Tests must be independent, readable, and stable.
- Do not guess. When important information cannot be determined from the code, ask for clarification.
