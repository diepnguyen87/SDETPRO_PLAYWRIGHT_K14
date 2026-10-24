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
- Android (Playwright real-device) — `playwright.config.android.js`, `tests/real-android/`
- Docker — `Dockerfile` + `docker-compose.yml` for containerised test runs

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
- **Page Objects** — expose component accessors. Locators are defined in both pages and components. Locators that do not belong to a component are defined in the page. Page-level CSS/XPath interactions go through `withHealing()`.
- **Components** — own locators and actions. All interactions go through wrapped methods (never call `locator.click()` directly).

---

## Page Objects

- All pages must extend `BasePage` with constructor `(page: Page, testInfo: TestInfo)`.
- `BasePage extends Component` with `body` as its root locator, so pages inherit `withHealing()`. Page-level CSS/XPath interactions must use `this.withHealing(selectorStr, action)` — never `this.page.locator(sel).click()` / `.fill()` / `.textContent()` directly.
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
- All CSS/XPath-based interactions must go through `Component.withHealing(selectorStr, action)` — this is the single self-healing entry point for all action types (`click`, `fill`, `selectOption`, `check`, `uncheck`, etc.), for both components and pages (via `BasePage`).
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

## Test Environments (SIT / UAT)

- The target environment is selected by `TEST_ENV` (`sit` | `uat`, default `sit`), e.g. `TEST_ENV=uat yarn test:smoke`.
- `config/environment.config.ts` is the single source of truth: it validates `TEST_ENV` and holds each environment's `baseURL`. Never hardcode a base URL — use `baseURL` (`page.goto("/...")`) or `envConfig.baseURL`.
- Environment variables:
  - `.env` — environment-independent keys only (`OPEN_*`, `RANDOMMER_API_KEY`), loaded by `import "dotenv/config"`.
  - `.env.sit` / `.env.uat` — environment-specific keys (`LOGIN_*`, `LOGIN_EMAIL_<idx>`/`LOGIN_PASSWORD_<idx>`, `REGISTER_*`), loaded by `playwright.config.web.js` via ``dotenv.config({ path: `.env.${testEnv}` })``. Variables already in `process.env` (CI `--env-file`) take precedence.
- UAT is a sample environment (fake URL, fake `uat_`-prefixed accounts); it has no test data yet, so `TEST_ENV=uat` fails fast at `TestDataProvider` load.

---

## Test Data

- Environment-specific test data lives in `test-data/{env}/` (`test-data/sit/`, `test-data/uat/`) as JSON files.
- Shared, non-environment files stay in `test-data/`: `pages.json` (page registry) and `model/` (types).
- Specs and flows read environment data only through `test-data/TestDataProvider.ts` (`testData.login`, `testData.standardComputer`, …), which statically imports each environment's JSON (`with { type: "json" }`) and selects the set for `TEST_ENV`. Adding a data file means adding it under every environment folder and registering it in `TestDataProvider.ts`.
- Do not import `test-data/{env}/*.json` directly, use `require()`, or hardcode data inline.
- Never hardcode credentials, emails, card numbers, addresses, or API keys in source files.
- `OPEN_API_KEY` is read from environment only (`process.env.OPEN_API_KEY`) — never hardcode it.
- AI model settings (`OPEN_ANALYSIS_MODEL`, `OPEN_REVIEW_MODEL`) are read from `.env` only — never hardcode them.

---

## Assertions

- Every test must assert a meaningful expected outcome. No action-only tests.
- Use Playwright web-first assertions (`expect(locator).toBeVisible()`, `expect(locator).toHaveText()`, etc.).
- Do not use manual waits as a substitute for proper assertions.

---

## AI Self-Healing — Critical

The self-healing pipeline is a core part of this framework.
Do not remove, bypass, or restructure it.

- All CSS/XPath interactions go through `withHealing()` (see Components) — never bypass it to make a test pass.
- Full pipeline rules (entry points, collectors, `HealingEngine` lifecycle, outcome handling, the "Never remove" list) live in `.claude/rules/self-healing.md`. Read it before changing anything under `ai/`, `models/ai/`, `tests/fixtures/`, or `Component.ts`, `BasePage.ts`, `FailedLocatorManager.ts`, `config/framework.config.ts`.

---

## AI Review Tool (Standalone)

`ai/review.ts` is a standalone CLI tool — it is **not** part of the self-healing pipeline.

- Reads `implementation-plan.md`, `CLAUDE.md`, and files listed under `## Relevant Files` in the plan
- Sends them to OpenAI for an independent code review
- Writes output to `implement-review/openai-review.md`
- Uses `OPEN_API_KEY` and `OPEN_REVIEW_MODEL` from `.env` (currently `gpt-5.3-codex`; configurable via env, not hardcoded)
- Run via: `yarn ai:review` (runs `tsx ai/review.ts`)

Do not integrate `ai/review.ts` into `HealingEngine`, `Component`, or any test fixture.

---

## Code Modification

- Do not delete or rename existing test files, Page Objects, or Components without approval.
- Do not change `package.json` dependency versions without approval.
- Do not rewrite the framework or refactor surrounding code unless explicitly asked.
- Do not add new npm dependencies without approval.
- Do not add comments, docstrings, or type annotations to code you did not change.

---

## GitHub Actions

Workflow, CI environment-variable, and `gh-pages` report rules live in `.claude/rules/github-actions.md`. Read it before changing `.github/workflows/`, `Dockerfile`, `docker-compose.yml`, or `.dockerignore`. Never hardcode secrets in workflow files.

---

## Test Execution

After any code change:
1. Run the relevant test.
2. Check the result.
3. If it fails, investigate the root cause before changing code.
4. Fix the issue, then run again.

Never claim a test passed unless it was actually executed successfully.

The project type-checks with zero errors (`tsc --noEmit`; `artifacts/` is excluded in `tsconfig.json`). A PostToolUse hook (`.claude/hooks/typecheck.mjs`, registered in `.claude/settings.json`) runs `tsc` after every `.ts` edit and reports any type errors — fix them before moving on.

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
