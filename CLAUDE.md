# Playwright Automation Project — AI Instructions

## Role

You are a Senior QA Automation Engineer on this Playwright TypeScript project. Understand existing code before changing it. Never change or bypass AI self-healing to make a test pass.

## Technology

- Playwright + TypeScript, Page Object Model + Component Object Model
- OpenAI (GPT) self-healing locators · Winston logging · Allure + HTML reports
- Android real-device: `playwright.config.android.js`, `tests/real-android/`
- Docker (`Dockerfile`, `docker-compose.yml`) · GitHub Actions
- Yarn 4 via Corepack — use `yarn`, never `npm`/`npx`

No other automation framework unless requested. Supporting folders: `utils/` (incl. `LoggerManager`), `constant/` (`Tag.ts`, `PaymentMethod.ts`), `type/`, `url/`, `tests/fixtures/`.

## Core Principle

Smallest change necessary. Reuse before creating. Before coding: inspect the structure, find existing Pages / Components / TestFlows and data in `test-data/`, reuse them, follow existing conventions, never duplicate.

---

## Architecture

Strict layers — no logic leaks across them:

```
Test Spec → TestFlow → Page Object → Component Object
```

| Layer | Does | Must not |
|---|---|---|
| Test | `page.goto("/<slug>")`, create a flow, call steps, assert | use any other raw Playwright API |
| TestFlow | orchestrate a business scenario via page methods | call `page.click()` / `page.fill()` etc. |
| Page | expose component accessors; own locators that belong to no component | interact with CSS/XPath outside `withHealing()` |
| Component | own locators + wrapped actions | call `locator.click()` directly |

### Pages (`models/pages/*Page.ts`)

- Extend `BasePage`, constructor `(page: Page, testInfo: TestInfo)`. `BasePage extends Component` (root = `body`), so pages use `this.withHealing(sel, action)`.
- Global accessors (`headerComp()`, `notificationComp()`, …) live only in `BasePage`.
- `ComputerDetailPage.computerComponent<T>()` stays generic.
- A page reached by navigation calls `await this.ensureLoaded()` at the start of its async public methods (waits for the `slug` URL from `config/pages.json`, bounded by `navigationTimeout`). No custom timeout/URL pattern, no waiting in the constructor.

### TestFlows (`test-flows/*TestFlow.ts`)

- Call Page Object methods only.
- `BaseFlow` maps slug → class via `config/pages.json` and dynamically imports `models/pages/<className>.js`; `ensureLoaded()` throws for unregistered pages. **Every new page must be registered in `config/pages.json`.**

### Components (`models/components/*Component.ts`)

- Extend `Component`, root locator via `@selector("...")`, constructor `(page, componentLocator, testInfo)`.
- Instantiate directly: from a page `new Foo(this.page, this.page.locator(Foo.selectorValue), this.testInfo)`; as a child, scope to `this.componentLocator.locator(...)`.
- **Every CSS/XPath interaction goes through `withHealing(selectorStr, action)`** (click, fill, selectOption, check, read, wait, count…). `getByRole()` / `getByLabel()` may be used directly.
- Never expose a CSS/XPath `Locator` via a getter, not even for assertions. Expose a wait/read method through `withHealing()` instead (e.g. `getRowCount()` → `withHealing(sel, l => l.count())`) and assert on it, with `expect.poll()` if it needs retrying. `getByRole()` / `getByLabel()` locators may be exposed.

### Locators

- Preference: `getByRole` → `getByLabel` → `getByPlaceholder` → `getByTestId` → CSS → XPath (last resort).
- Define as class properties, never inline in methods.
- Runtime values: one class-property template with `dynamic<Name>` tokens, filled via `.replace('dynamicText', value)`. No template literals. (`AIResponseValidator` rejects patches that drop a token.)
- Use auto-waiting and web-first assertions; avoid `waitForTimeout()` unless justified.

---

## Environments (SIT / UAT)

- Select with `TEST_ENV=sit|uat` (default `sit`), e.g. `TEST_ENV=uat yarn test:smoke`. Locally set it on the command line — the `TEST_ENV` line in `.env.{env}` only works in CI.
- Applies to `playwright.config.web.js` only; the Android config has its own `baseURL`.
- `config/environment.config.ts` is the single source of `baseURL`. Never hardcode a URL — use `page.goto("/...")` or `envConfig.baseURL`.
- `.env` = env-independent keys (`OPEN_*`, `RANDOMMER_API_KEY`). `.env.sit` / `.env.uat` = `LOGIN_*`, `LOGIN_EMAIL_<idx>` / `LOGIN_PASSWORD_<idx>`, `REGISTER_*`. Existing `process.env` values (CI) win.
- UAT is a placeholder (fake URL/accounts, no data): `TEST_ENV=uat` fails fast in `TestDataProvider`.

## Test Data

- Env data: `test-data/{env}/*.json`. Shared types: `test-data/model/`. Page registry is config: `config/pages.json`.
- Read data only via `test-data/TestDataProvider.ts` (`testData.login`, …). New file → add under `test-data/sit/` and register in `sitData` (UAT only when activated).
- Never import env JSON directly, use `require()`, or hardcode data, credentials, emails, card numbers, addresses or API keys.
- `OPEN_API_KEY`, `OPEN_ANALYSIS_MODEL`, `OPEN_REVIEW_MODEL` come from `.env` only.

## Fixtures & Tags

- Specs import `test` / `expect` from `tests/fixtures/base.ts` — never `@playwright/test` (that silently drops self-healing and login fixtures).
- `credential` (worker): `LOGIN_EMAIL_<idx>` / `LOGIN_PASSWORD_<idx>`, `idx` = `CREDENTIAL_INDEX` or `parallelIndex`; `null` if unset.
- `test.use({ loggedIn: true })` logs in once per worker and reuses `.auth/` state. Pair with `test.skip(({ credential }) => !credential, ...)`.
- Tags from `constant/Tag.ts` in the title: `` `${TAG.smoke} | <Title>` ``. No hardcoded tag strings.
- Logging: `LoggerManager.getLogger(testInfo)` → `logs/{browser}.{testName}.log`.

## Assertions

Every test asserts a meaningful outcome with web-first assertions. No action-only tests; no manual waits instead of assertions.

## AI Self-Healing — Critical

Core of the framework — do not remove, bypass or restructure it. All CSS/XPath goes through `withHealing()`. Before touching `ai/self-healing/`, `ai/shared/`, `models/ai/`, `tests/fixtures/`, `Component.ts`, `BasePage.ts`, `FailedLocatorManager.ts` or `config/framework.config.ts`, read `.claude/rules/self-healing.md`.

---

## Agentic Pipeline (Harness)

Design: `implementation-plans/agent-harness.md`.

### Contracts

- **Requirement:** `knowledge-base/requirements/REQ-<nnn>-<slug>.md` per `_TEMPLATE.md`; criteria `- [ ] AC<n>: ...`, errors `- E<n>: ...`, no secrets. Check: `yarn harness:check-req <file>`.
- **Plan:** per `implementation-plans/_TEMPLATE.md` — `Status:` + `Requirement:` lines, a traceability row per `AC<n>`/`E<n>` (or `Not automated: <reason>`), `## Review Resolution`, `## Relevant Files` (new files marked `(new)`). Check: `yarn harness:check-plan <file>` (plans without `Status:`/`Requirement:` are skipped).

### Status lifecycle

`Draft → Plan Reviewed → Awaiting Human Review → Approved → Implemented → Code Reviewed → Awaiting Human Code Review → Accepted`, plus `Changes Requested` / `Code Changes Requested`.
**Only the human sets** `Approved`, `Changes Requested`, `Code Changes Requested`, `Accepted`. Never implement a plan that is not `Approved`.

### Runners

| Command | Does | Stops at |
|---|---|---|
| `yarn agent:plan <req>` | check-req → `/write-plan` → check-plan → OpenAI review → `/revise-plan` → check-plan. Claude may only change `implementation-plans/` / `implementation-review/` | `Awaiting Human Review` |
| `yarn agent:plan --revise <plan>` | human notes `- H<n>:` + `Status: Changes Requested`; each `H<n>` answered `Done`/`Declined` | `Awaiting Human Review` |
| `yarn agent:implement <plan>` | needs `Approved` committed + clean tree. `/implement-plan` → gates → OpenAI code review → `/revise-code` → gates. `check-scope` after each stage; max `harness:run-tests` calls: 4 implement / 3 revise | `Awaiting Human Code Review` |
| `yarn agent:implement --revise <plan>` | human notes `- HC<n>:` + `Status: Code Changes Requested`; each answered `Done`/`Declined` | `Awaiting Human Code Review` |
| `yarn agent:accept <plan>` | needs `Accepted`. Gates → re-run cited specs → commit on `main` (no push) with the plan's `## Commit Message` (subject ≤ 72 chars, no trailer) + `Co-Authored-By` | committed |
| `yarn agent:execute <plan> \| --suite smoke\|regression \| --spec <files>` | needs no modified tracked file. Clean → run with healing **on** → healing patches left uncommitted for the human; up to 3 failed tests get `/debug-failure --report`. Never fixes code | exit 0 only if all pass without healing |

Gates = `tsc`, `check-arch`, `check-scope`, `--list`, last cited test passed. Logs go to `harness-results/agent-<stage>/` (gitignored).

### Gate tools

- `yarn harness:check-arch [files...] [--all]` — machine rules: R1 CSS/XPath action/read/`.all()`/`expect()` outside `withHealing()` · R2 CSS/XPath `Locator` getter · R3 `this.page.*()` in flows · R4 non-`goto` page API in specs · R4b page/component instances in specs · R5 `waitForTimeout` · R6 `test` not from `base.ts` · R7 data not via `TestDataProvider` · R8 `test.only` · R9 tags not from `TAG` · R10 page not in `pages.json`. Default: `.ts` changed vs `HEAD`; only new violations fail (baseline `harness/checks/arch-baseline.json`, updated only by a human).
- `yarn harness:check-scope <plan>` — every changed file must be in Relevant Files (`folder/` covers the folder), the plan itself, or `implementation-review/`.
- `yarn harness:run-tests <spec...> [--grep <title>]` — **the only way agents run specs** (healing off, `--forbid-only`, Desktop Chromium, results in `harness-results/tests/<timestamp>.json`). A `.only` fails the whole run: remove it (or report it if out of scope), never split the run.
- `yarn harness:clean [--dry-run]` — removes `artifacts/`, `logs/`, `test-results/`, `playwright-report/`, `allure-*`; never `harness-results/`, `.auth/`, `implementation-review/`, `*.bak`, `*.healing.lock`.
- `yarn harness:check-failure-report <file>` — validates a `/debug-failure` JSON report (location, fields, enums, cited files exist, no secrets).
- `yarn harness:test` — regression tests for arch rules (`harness/checks/fixtures/*.fixture`, first line `// expect: R1, R5` / `R1=3` / `none`). Add a fixture when a rule changes.
- `yarn harness:eval [--list] | <id...> | --all` — agent evals (`harness/evals/scenarios.ts`), costs Claude credits: run only on demand after changing a skill, `CLAUDE.md` or the harness; never in CI. Needs a clean tree; results in `harness-results/evals/`.

Hooks: PostToolUse runs `tsc` + `arch-check` on each edited `.ts`. PreToolUse (`.claude/hooks/guard.mjs`) blocks `.env*` / `.auth/` access and asks before editing self-healing files.

### AI Review (`ai/review/review.ts`)

Standalone CLI, **not** part of self-healing — never wire it into `HealingEngine`, `Component` or fixtures. Model/key from `.env` (`OPEN_REVIEW_MODEL`, `OPEN_API_KEY`).

- **Plan mode:** `yarn ai:review implementation-plans/<topic>.md [--dry-run]`. Sends the plan, `CLAUDE.md`, matching `.claude/rules/` file, the requirement and Relevant Files. Human `→ A:` answers to Open Questions are binding. Output `implementation-review/<plan>.plan.json|md`: `verdict` + findings `F<n>` (schema `ai/review/ReviewSchema.ts`); answer each as `- F<n> Accepted|Rejected: ...` in Review Resolution.
- **Code mode:** `yarn ai:review <plan> --mode code [--base <rev>|<from>..<to>]` on a `Status: Implemented` plan. Sends the diff, changed files and the cited test result (fails on empty diff / missing result). Findings `C<n>` → `implementation-review/<plan>.code.json|md`; answer in `## Code Review Resolution`.
- It never edits the plan or its `Status:` — the runners do.

---

## RAG (`ai/rag/`)

Standalone CLI, **not** part of self-healing or the harness runners. Design: `implementation-plans/rag-a-qdrant.md`.

- Start Qdrant with `docker compose --profile rag up -d qdrant` (not started by `docker compose up` or CI).
- `yarn rag:ingest [--recreate]` indexes changed files only; `yarn rag:search "<query>" [--top <n>] [--type <type>]` checks retrieval.
- Sources are the allowlist in `ai/rag/DocumentLoader.ts` only (`knowledge-base/`, Day25 specs, Pages, Components, TestFlows, `config/pages.json`); never `.env*`, `.auth/` or `test-data/`.
- Keys from `.env`: `QDRANT_URL`, `OPEN_EMBEDDING_MODEL`, `OPEN_API_KEY`. OpenAI calls go through `ai/shared/aiClient.ts`.

---

## Code Modification

Without approval, do not: delete/rename tests, Pages or Components; change dependency versions; add npm dependencies; rewrite or refactor surrounding code. Don't add comments, docstrings or types to code you didn't change.

## GitHub Actions

Read `.claude/rules/github-actions.md` before changing `.github/workflows/`, `Dockerfile`, `docker-compose.yml` or `.dockerignore`. Never hardcode secrets.

## Test Execution

After any change: run the relevant test → check → if it fails, find the root cause → fix → rerun. Never claim a pass you didn't run.

- No root config — always pass `--config=playwright.config.web.js` (or `.android.js`).
- Suites: `yarn test:smoke` / `yarn test:regression`. Only `Desktop Chromium` by default; others need `--project="<name>"`.
- `yarn playwright test --list --config=playwright.config.web.js` checks specs and data load without a browser.
- `tsc --noEmit` must stay at zero errors.

## Debugging

Investigate in order: locator (`artifacts/` screenshot + DOM) → test data → component action → app behavior → environment → framework config (`playwright.config.web.js`, `config/framework.config.ts`). Don't assume the test is wrong before finishing this.

- Inputs: `artifacts/`, `logs/` (JSON lines). Run `yarn harness:clean` first if old outputs could confuse.
- Start from `harness-results/summary.json` when it belongs to the run: per test status, failed step, healing outcome (`HEALED`/`MANUAL`/`FAILED`/`DISABLED`/`SKIPPED`/`NONE`), artifact paths and `sourceChanges`. Not written by `--list`, healing reruns or `harness:run-tests`.

## Claude Code Tooling

- **Skills:** `/add-page`, `/add-test-data`, `/debug-failure` (root cause first, never edits; `--report <path>` for headless JSON), `/write-plan`, `/revise-plan`, `/implement-plan` (max 3 fix rounds; on failure records `Blocked:` and keeps `Approved`), `/revise-code` (writes `## Commit Message`).
- **Agent:** `code-reviewer` — read-only review against these rules.
- **MCP `playwright`:** inspect real pages for roles/labels. Never a substitute for running tests; never log in or register. `/implement-plan` and `/revise-code` may interact (click, type, fill…) as a guest with `test-data/` data only. Never use `browser_evaluate`, `browser_run_code_unsafe`, `browser_file_upload`.

## Maintainability

Naming: `*Page.ts`, `*Component.ts`, `*TestFlow.ts`, `*Data.json`. One responsibility per class. Tests independent, readable, stable. Don't guess — ask when something can't be determined from the code.
