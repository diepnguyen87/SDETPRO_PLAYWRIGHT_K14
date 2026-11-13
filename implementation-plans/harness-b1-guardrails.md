# Implementation Plan: Harness B1 — Guardrails and Automatic Checks

Part of `implementation-plans/harness-b-implement.md` (Slice B).

## Objective

Turn the checkable rules of CLAUDE.md into machine gates, limit what an implementing agent may touch, and give
immediate feedback after each edit.

---

## 1. `harness/checks/arch-check.ts` — `yarn harness:check-arch [files...] [--all] [--json] [--update-baseline]`

TypeScript compiler API (already a dependency). Default scope: `.ts` files changed vs `HEAD` (incl. untracked);
`--all`: `models/`, `test-flows/`, `tests/web/`.

| Rule | Applies to | Violation |
|---|---|---|
| R1 `no-direct-css-action` | models, flows, specs | an action/read (`click`, `fill`, `check`, `isVisible`, `textContent`, …) on a chain containing `.locator(`, outside a `withHealing()` callback (also through a local variable assigned in the same function); `getByRole` / `getByLabel` chains allowed |
| R2 `no-css-locator-getter` | models | a method/getter returning `Locator` whose return expression contains `.locator(` |
| R3 `flow-no-raw-page-api` | test-flows | any `this.page.<member>(...)` call, no exception (since `9d5e74c` flows reach components through pages, e.g. `BasePage.headerComp()`); `expect(this.page)…` assertions are allowed |
| R4 `spec-raw-api` | tests/web | default-deny: any call on the `page`, `browser`, `context`, `request` fixtures except `page.goto`; `test.use/skip/afterEach/beforeEach/describe/step` and `expect(...)` allowed |
| R4b `spec-no-page-objects` | tests/web | `new <X>Page(...)` / `new <X>Component(...)` in a spec (passing a class reference to a flow is allowed) |
| R5 `no-wait-for-timeout` | all | `waitForTimeout(...)` |
| R6 `spec-imports-fixture` | `*.spec.ts` | `test` imported from `@playwright/test` |
| R7 `test-data-access` | all except `TestDataProvider.ts` | import of `test-data/sit|uat/*.json`, `require(...)` |
| R8 `no-test-only` | specs | `test.only` / `test.describe.only` |
| R9 `tag-from-constant` | specs | literal `@Smoke` / `@Regression` / `@Sanity` in a test title |
| R10 `page-registered` | `models/pages/*Page.ts` | page class (except `BasePage`) missing from `config/pages.json` |

**Baseline** `harness/checks/arch-baseline.json`: existing violations keyed by rule + file + normalized source text (not line
numbers); only new violations fail. Written with `--update-baseline` (human only; outside every plan's Relevant Files, so
`scope-check` blocks agents). Known existing: `waitForTimeout` (OrderTestFlow ×3; the Day25 specs were cleaned in `1e24e6f`), `OrderTestFlow`
`this.page.waitForResponse`, `HeaderComponent.isLogoutVisible()`, `LoginPageMethod1/2`, page objects created in older specs.

**Checker tests** `harness/checks/fixtures/`: one violating and one valid sample per rule with expected results;
`yarn harness:test` runs the checker on them.

## 2. `harness/checks/scope-check.ts` — `yarn harness:check-scope <plan>`

Every file changed, added or deleted vs `HEAD` must be in the plan's Relevant Files (an entry ending with `/` covers a folder),
be the plan itself, or be under `implementation-review/`; otherwise fail and list the files.

## 3. `.claude/hooks/guard.mjs` (PreToolUse)

- Read / Edit / Write on `.env*` or `.auth/` → deny.
- Bash referencing a `.env*` file or `.auth/` → deny (`process.env`, `dotenv` unaffected).
- Edit / Write on self-healing pipeline files (`ai/`, `models/ai/`, `tests/fixtures/`, `Component.ts`, `BasePage.ts`,
  `FailedLocatorManager.ts`, `config/framework.config.ts`) → ask (blocked when headless).

## 4. Immediate feedback

The PostToolUse hook runs `arch-check` on the edited file after `tsc`; new violations → exit 2.

## 5. Documentation

`CLAUDE.md`: Gates section (`check-arch`, `check-scope`, baseline, guard). `package.json`: `harness:check-arch`,
`harness:check-scope`, `harness:test`.

---

## Verification

1. Typecheck clean; `yarn harness:test` passes (each rule flags its violating sample, not its valid one).
2. `yarn harness:check-arch --all` with the baseline → 0 new violations.
3. A planted CSS getter in `CartItemRowComponent` fails `check-arch` and the PostToolUse hook (then reverted).
4. `check-scope` on the REQ-002 plan fails for a planted change outside Relevant Files (then reverted).
5. Guard hook, fed JSON on stdin: reading `.env.sit` denied, editing `ai/HealingEngine.ts` asks.
6. Two Day25 specs still pass.

## Risks

R1 relies on `.locator(` in the call chain (plus locals assigned in the same function); locators passed through
parameters or fields can be missed — left to `code-reviewer` and the OpenAI code review.

## Relevant Files

- harness/checks/arch-check.ts (new)
- harness/checks/arch-baseline.json (new)
- harness/checks/scope-check.ts (new)
- harness/checks/run-fixtures.ts (new)
- harness/checks/fixtures/ (new)
- harness/checks/markdown.ts
- harness/checks/plan-check.ts
- .claude/hooks/guard.mjs (new)
- .claude/hooks/typecheck.mjs
- .claude/settings.json
- package.json
- CLAUDE.md
- implementation-plans/harness-b-implement.md
- models/components/Component.ts
- config/pages.json
