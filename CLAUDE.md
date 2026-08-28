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
- All user interactions must go through `Component.click()` and equivalent wrapped methods. Calling `locator.click()` directly bypasses self-healing.
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

The self-healing pipeline is a core part of this framework. Do not remove, bypass, or restructure it.

### How it works
1. `Component.click()` wraps every locator action in a try/catch.
2. On failure, `FailedLocatorManager.set(locatorName)` records the failed locator.
3. `collectFailureArtifacts()` captures: screenshot, DOM, metadata JSON, component source file — all saved to `artifacts/`.
4. `ai/AIAnalyzer.ts` sends the artifacts to OpenAI (vision + text) and receives a suggested locator fix.
5. `ai/PatchApplier.ts` applies the fix to the component source file and creates a `.bak` backup.

### Rules
- Never remove or comment out `FailedLocatorManager.set(locatorName)` before a click.
- Never remove `collectFailureArtifacts()` from the catch block in `Component.click()`.
- Artifact folder and file names must always come from `config/framework.config.ts` — never hardcode paths.
- Do not change the OpenAI model (`gpt-5-mini`) or prompt structure in `ai/promptBuilder.ts` without explicit instruction.
- Do not remove the `.bak` backup logic in `PatchApplier.ts` — it is the only rollback mechanism.
- `ComponentFactory.create()` must continue tracking `sourceFile` — `SourceCodeCollector` depends on it to find the right file.
- Artifact collection happens **before** the error is thrown — do not reorder this sequence.
- AI-generated locator patches must not be accepted blindly — review the suggested locator against the current DOM before applying.
- Preserve existing framework behavior and architecture when applying self-healing fixes — a patch must only change the failed locator, nothing else.
- When a self-healing patch may affect framework behavior beyond the failed locator, stop and ask for approval.

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
