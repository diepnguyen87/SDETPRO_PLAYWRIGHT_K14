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
- Yarn 4 via Corepack (`packageManager` in `package.json`) — run everything with `yarn`, not `npm`/`npx`

Do not introduce another automation framework unless explicitly requested.

Supporting folders: `utils/` (helpers, incl. `LoggerManager`), `constant/` (`Tag.ts`, `PaymentMethod.ts`), `type/`, `url/`, `tests/fixtures/` (custom `test`).

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

- **Tests** — open the entry URL with `page.goto("/<slug>")`, instantiate a flow, call high-level steps, assert outcomes. No other raw Playwright API.
- **TestFlows** — orchestrate page interactions across a business scenario. No `page.click()` or `page.fill()` directly.
- **Page Objects** — expose component accessors. Locators are defined in both pages and components. Locators that do not belong to a component are defined in the page. Page-level CSS/XPath interactions go through `withHealing()`.
- **Components** — own locators and actions. All interactions go through wrapped methods (never call `locator.click()` directly).

---

## Page Objects

- All pages must extend `BasePage` with constructor `(page: Page, testInfo: TestInfo)`.
- `BasePage extends Component` with `body` as its root locator, so pages inherit `withHealing()`. Page-level CSS/XPath interactions must use `this.withHealing(selectorStr, action)` — never `this.page.locator(sel).click()` / `.fill()` / `.textContent()` directly.
- Global component accessors (`headerComp()`, `notificationComp()`, etc.) are defined only in `BasePage` — do not duplicate them in subclasses.
- `ComputerDetailPage.computerComponent<T>()` is generic by design — preserve the type parameter when adding new computer types.
- A page reached by a navigation (e.g. after a form submit) calls `await this.ensureLoaded()` at the start of its async public methods. `BasePage.ensureLoaded()` waits until the URL matches the page's `slug` in `config/pages.json`, bounded by `navigationTimeout` in the Playwright config. Do not add a timeout or URL pattern in the page class, and do not wait in the constructor.
- Naming convention: `*Page.ts` in `models/pages/`.

---

## Test Flows

- Flows call Page Object methods only — no raw Playwright API calls inside flows.
- `BaseFlow.getClassNameBySlug()` maps a slug to a class name via `config/pages.json`, and `BaseFlow.createPageInstance(className)` dynamically imports `models/pages/<className>.js`. `BasePage.ensureLoaded()` also reads that registry and throws for an unregistered page, so every new page must be added to `config/pages.json`.
- Naming convention: `*TestFlow.ts` in `test-flows/`.

---

## Components

- All components must extend `Component` and use the `@selector("...")` decorator for their root locator.
- Instantiate components directly: from a page, `new FooComponent(this.page, this.page.locator(FooComponent.selectorValue), this.testInfo)`; a child of another component is scoped to its parent: `new FooComponent(this.page, this.componentLocator.locator(FooComponent.selectorValue), this.testInfo)`.
- Constructor signature: `(page, componentLocator, testInfo)`.
- All CSS/XPath-based interactions must go through `Component.withHealing(selectorStr, action)` — this is the single self-healing entry point for all action types (`click`, `fill`, `selectOption`, `check`, `uncheck`, etc.), for both components and pages (via `BasePage`).
- `getByRole()` and `getByLabel()` locators may call `.click()` directly — they are inherently stable and do not require self-healing.
- Never call `locator.click()`, `locator.fill()`, or any other interaction directly on a CSS/XPath locator — this bypasses self-healing.
- Never expose a CSS/XPath locator through a getter (`foo(): Locator`) on a component or page, not even "for assertions only" — an assertion on it bypasses `withHealing()`. Expose a wait or read method that goes through `withHealing()` instead (e.g. `waitForConfirmStep()` → `this.withHealing(this.confirmBtnSel, l => l.waitFor())`, `getRowCount()` → `this.withHealing(sel, l => l.count())`) and assert on its result, with `expect.poll()` when the value needs retrying. `getByRole()` / `getByLabel()` locators may be exposed for web-first assertions.
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
- A locator that depends on runtime values is a class-property template with placeholder tokens named `dynamic<Name>` (e.g. `dynamicText`, `dynamicIndex`), substituted with `.replace('dynamicText', value)`. Never build it with a template literal or inside a method, and declare each template once. `AIResponseValidator` rejects healing patches that drop a placeholder token.
- Avoid fragile selectors. Avoid `page.waitForTimeout()` unless technically justified.
- Use Playwright auto-waiting and web-first assertions.

---

## Test Environments (SIT / UAT)

- The target environment is selected by `TEST_ENV` (`sit` | `uat`, default `sit`), e.g. `TEST_ENV=uat yarn test:smoke`. Locally, set it on the command line: `environment.config.ts` reads `TEST_ENV` before `.env.${testEnv}` is loaded, so the `TEST_ENV` line inside `.env.sit` / `.env.uat` only takes effect in CI (env file passed to the container).
- `TEST_ENV` applies to `playwright.config.web.js` only. `playwright.config.android.js` has its own hardcoded `baseURL` and does not load `.env.{env}`.
- `config/environment.config.ts` is the single source of truth: it validates `TEST_ENV` and holds each environment's `baseURL`. Never hardcode a base URL — use `baseURL` (`page.goto("/...")`) or `envConfig.baseURL`.
- Environment variables:
  - `.env` — environment-independent keys only (`OPEN_*`, `RANDOMMER_API_KEY`), loaded by `import "dotenv/config"`.
  - `.env.sit` / `.env.uat` — environment-specific keys (`LOGIN_*`, `LOGIN_EMAIL_<idx>`/`LOGIN_PASSWORD_<idx>`, `REGISTER_*`), loaded by `playwright.config.web.js` via ``dotenv.config({ path: `.env.${testEnv}` })``. Variables already in `process.env` (CI `--env-file`) take precedence.
- UAT is a sample environment (fake URL, fake `uat_`-prefixed accounts); it has no test data yet, so `TEST_ENV=uat` fails fast at `TestDataProvider` load.

---

## Test Data

- Environment-specific test data lives in `test-data/{env}/` (`test-data/sit/`, `test-data/uat/`) as JSON files.
- Shared, non-environment files stay in `test-data/`: `model/` (types). The page registry is app configuration, not test data, and lives in `config/pages.json`.
- Specs and flows read environment data only through `test-data/TestDataProvider.ts` (`testData.login`, `testData.standardComputer`, …), which statically imports each environment's JSON (`with { type: "json" }`) and selects the set for `TEST_ENV`. Adding a data file means adding it under `test-data/sit/` and registering it in `sitData` in `TestDataProvider.ts`; UAT has no dataset yet (`dataSets.uat` is `undefined`), so UAT files are added only when UAT is activated.
- Do not import `test-data/{env}/*.json` directly, use `require()`, or hardcode data inline.
- Never hardcode credentials, emails, card numbers, addresses, or API keys in source files.
- `OPEN_API_KEY` is read from environment only (`process.env.OPEN_API_KEY`) — never hardcode it.
- AI model settings (`OPEN_ANALYSIS_MODEL`, `OPEN_REVIEW_MODEL`) are read from `.env` only — never hardcode them.

---

## Test Fixtures

- Specs import `test` (and `expect`) from `tests/fixtures/base.ts`, not from `@playwright/test`. The custom `test` wraps every test body with the self-healing guard (assertion healing + `SelfHealingSuccess` handling) and provides the login fixtures; a spec that imports from `@playwright/test` silently loses both.
- `credential` (worker fixture) reads `LOGIN_EMAIL_<idx>` / `LOGIN_PASSWORD_<idx>` from env, where `idx` is `CREDENTIAL_INDEX` if set (CI shards) or the worker's `parallelIndex`; it is `null` when not set.
- `test.use({ loggedIn: true })` logs in once per worker via `LoginTestFlow` and reuses the storage state saved under `.auth/` (`frameworkConfig.authFolder`). Pair it with `test.skip(({ credential }) => !credential, ...)`.
- Tags come from `constant/Tag.ts` (`TAG.smoke` / `TAG.regression` / `TAG.sanity` → `@Smoke` / `@Regression` / `@Sanity`) in the test title: `` `${TAG.smoke} | <Title>` ``. Do not hardcode tag strings.
- Test logging goes through `LoggerManager.getLogger(testInfo)` (Winston, one file per browser + test: `logs/{browser}.{testName}.log`).

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

## Requirements and Plans (Harness Contracts)

The agentic pipeline (`implementation-plans/agent-harness.md`) chains stages through two file formats, both machine-checked.

- **Requirements** live in `requirements/REQ-<nnn>-<slug>.md`, following `requirements/_TEMPLATE.md`. Every acceptance criterion is `- [ ] AC<n>: ...` and every error case `- E<n>: ...`. No secrets in the file. Copilot Chat writes them with `.github/prompts/write-requirement.prompt.md`. Validate with `yarn harness:check-req <file>`.
- **Pipeline plans** follow `implementation-plans/_TEMPLATE.md`: a `Status:` and a `Requirement:` line under the title, an Acceptance Criteria Traceability row for every `AC<n>` / `E<n>` (or `Not automated: <reason>`), a `## Review Resolution` answering each OpenAI finding, and `## Relevant Files` with new files marked `(new)`. Validate with `yarn harness:check-plan <file>`; plans without `Status:` / `Requirement:` (written before the contract) are skipped.
- **Runner:** `yarn agent:plan requirements/REQ-<nnn>-<slug>.md` runs `check-req` → `claude -p /write-plan` → `check-plan` → `yarn ai:review` → `claude -p /revise-plan` → `check-plan` and stops at `Awaiting Human Review` (log in `harness-results/agent-plan/`, gitignored). Each Claude stage may only change `implementation-plans/` / `implementation-review/`; any other change fails the run. To send a plan back, add `- H<n>: ...` notes under `## Human Review Notes`, set `Status: Changes Requested` and run `yarn agent:plan --revise implementation-plans/<plan>.md` (no new OpenAI review); every `H<n>` is answered `Done` / `Declined` in Review Resolution.
- **Status lifecycle:** `Draft → Plan Reviewed → Awaiting Human Review → Approved → Implemented → Code Reviewed → Awaiting Human Code Review → Accepted`, plus `Changes Requested`. Only the human sets `Approved`, `Changes Requested` and `Accepted`; never implement a plan that is not `Approved`.

### Gates and Guardrails

- `yarn harness:check-arch [files...] [--all]` — the machine-checkable rules of this file (R1 no CSS/XPath action, read or `expect()` outside `withHealing()`; R2 no CSS/XPath `Locator` getter; R3 no `this.page.*()` in flows; R4 only `page.goto()` on fixtures in specs; R4b no page/component instances in specs; R5 no `waitForTimeout`; R6 specs import `test` from `tests/fixtures/base.ts`; R7 data only through `TestDataProvider`; R8 no `test.only`; R9 tags from `TAG`; R10 pages registered in `config/pages.json`). Default scope: `.ts` files changed vs `HEAD`. Pre-existing violations are recorded in `harness/checks/arch-baseline.json`; only new ones fail. Only a human runs `--update-baseline`.
- `yarn harness:check-scope <plan>` — every file changed vs `HEAD` must be listed in the plan's Relevant Files (a `folder/` entry covers the folder), be the plan itself or be under `implementation-review/`.
- `yarn harness:run-tests <spec...> [--grep <title>]` — the only way agents run specs: sets `SELF_HEALING_DISABLED=true`, the web config and `Desktop Chromium`, and writes per-test results to `harness-results/tests/<timestamp>.json`.
- `yarn harness:test` — regression tests of the arch-check rules (`harness/checks/fixtures/*.fixture`, first line `// expect: R1, R5` or `// expect: none`). Add a fixture when a rule changes.
- The PostToolUse hook runs `arch-check` on each edited file after `tsc`. The PreToolUse hook `.claude/hooks/guard.mjs` denies reading or editing `.env*` / `.auth/` (also through Bash) and asks before editing self-healing pipeline files.

---

## AI Review Tool (Standalone)

`ai/review.ts` is a standalone CLI tool — it is **not** part of the self-healing pipeline.

- Reads the plan passed as its argument, `CLAUDE.md`, the matching `.claude/rules/` file when Relevant Files touch the self-healing pipeline or CI, the requirement named on the plan's `Requirement:` line, and the files under `## Relevant Files` (`(new)` entries are sent as "new file", not read). All implementation plans live in `implementation-plans/` as `<topic>.md`.
- Sends them to OpenAI for an independent one-pass plan review; human `→ A:` answers to Open Questions are treated as binding.
- Returns structured output (schema in `ai/ReviewSchema.ts`): `verdict` (`APPROVE` | `APPROVE_WITH_CHANGES` | `REJECT`) and findings `F<n>` (`REQUIRED_FIX` | `RECOMMENDED` | `VERIFICATION`, severity, file, problem, action, requirement ids).
- Writes `implementation-review/<plan-name>.plan.json` and a rendered `implementation-review/<plan-name>.plan.md`. When the JSON exists, `yarn harness:check-plan` requires `## Review Resolution` to answer every finding as `- F<n> Accepted|Rejected: ...` from `Awaiting Human Review` on.
- Uses `OPEN_API_KEY` and `OPEN_REVIEW_MODEL` from `.env` (currently `gpt-5.3-codex`; configurable via env, not hardcoded)
- Run via: `yarn ai:review implementation-plans/<topic>.md [--dry-run]` (runs `tsx ai/review.ts`; `--dry-run` lists the context without calling OpenAI). `--mode code` (review of generated code) is not implemented yet (harness Slice B).

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

Running tests:
- There is no default `playwright.config.*` at the root — always pass `--config=playwright.config.web.js` (web) or `--config=playwright.config.android.js` (Android), e.g. `yarn playwright test tests/web/Day25/TestStandardComponent.spec.ts --config=playwright.config.web.js`.
- Suites: `yarn test:smoke` / `yarn test:regression` (`--grep`, case-insensitive against the `@Smoke` / `@Regression` title tags).
- Only `Desktop Chromium` runs by default; the other projects (`Desktop Firefox`, `Desktop Webkit`, `Mobile Safari`, `Mobile Chrome`) need `--project="<name>"`.
- `yarn playwright test --list --config=playwright.config.web.js` checks that specs and test data load without opening a browser.

The project type-checks with zero errors (`tsc --noEmit`; `artifacts/` is excluded in `tsconfig.json`). A PostToolUse hook (`.claude/hooks/typecheck.mjs`, registered in `.claude/settings.json`) runs `tsc` after every `.ts` edit and reports any type errors — fix them before moving on.

---

## Claude Code Tooling

- Skills (`.claude/skills/`): `/add-page` (new Page Object + Components + `pages.json` entry), `/add-test-data` (new SIT data file + `TestDataProvider` registration), `/debug-failure` (artifacts → logs → data → component → app → env/config, root cause before fixing), `/write-plan` (requirement → `implementation-plans/REQ-<nnn>-<slug>.md` with `Status: Draft`, no code edits, open questions instead of asking), `/revise-plan` (answers every OpenAI finding `F<n>` or human note `H<n>` in Review Resolution, sets `Awaiting Human Review`), `/implement-plan` (implements an `Approved` plan within its Relevant Files, runs the gates and its specs through `yarn harness:run-tests`, at most 3 fix rounds, records `## Implementation Notes`, sets `Implemented` or records `Blocked:` and keeps `Approved`).
- Agent (`.claude/agents/code-reviewer.md`): read-only review of the current diff or a folder against these rules.
- MCP: `playwright` server in `.mcp.json` (runs the `@playwright/mcp` devDependency via `yarn playwright-mcp --isolated --allowed-origins https://demowebshop.tricentis.com --output-dir .playwright-mcp`, output dir gitignored; same binary as `yarn mcp:playwright` and `.vscode/mcp.json`). Use it to inspect real pages (accessibility snapshot) for roles/labels when writing locators — never as a substitute for running the tests, and never to log in or register (credentials in `.env.*` are off limits). `browser_navigate`, `browser_snapshot` and `browser_close` are allowed in `.claude/settings.json`; interactive tools prompt in interactive sessions. `/implement-plan` may also click, type, fill forms, select options, press keys, hover and wait to reach stateful pages (cart, checkout steps), as a guest with data from `test-data/` only; `browser_evaluate`, `browser_run_code_unsafe` and `browser_file_upload` are never used.

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
