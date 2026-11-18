# Implementation Plan: Architecture Check Catches Locator List Reads Outside withHealing()

Status: Accepted
Requirement: requirements/REQ-003-arch-check-locator-list-read.md

## Objective

Close the R1 gap in `harness/checks/arch-check.ts`: `.all()` and the other DOM-touching `Locator` methods missing from `LOCATOR_ACTIONS` (checked against the installed Playwright `1.64.0-alpha`) are reported when called on a CSS/XPath locator outside a `withHealing()` callback. Regression fixtures cover the new cases (the fixture runner gets an optional exact-count syntax so each case is proven). The five shared Page Object / Component methods that call `.all()` on a CSS locator move their list read into `withHealing()`. A list that must not be empty waits for its first element inside the callback, so a broken selector fails through the healing path. `CLAUDE.md` and the R1 description name list reads explicitly.

## Acceptance Criteria Traceability

This is a harness requirement: the checker is covered by `yarn harness:test` fixtures and `yarn harness:check-arch`, and the migration by the existing specs run through `yarn harness:run-tests`.

| ID | Covered by (spec › flow step) | Assertion |
|---|---|---|
| AC1 | `yarn harness:test` › `models/components/BadListReadComponent.ts.fixture`, `test-flows/BadListReadTestFlow.ts.fixture`, `tests/web/BadListRead.spec.ts.fixture` | Component fixture `// expect: R1=14` (4 `.all()` cases: `this.page.locator(sel).all()`, `this.componentLocator.locator(sel).all()`, local variable, `.filter(...).all()`; plus the 10 methods of AC3); flow fixture `// expect: R1, R3`; spec fixture `// expect: R1, R4` — the runner fails if the rules or the R1 count differ |
| AC2 | `yarn harness:test` › `models/components/GoodListReadComponent.ts.fixture`, updated `GoodActionComponent.ts.fixture` | `// expect: none` with `.all()` inside `withHealing()`, `getByRole(...).all()`, `getByLabel(...).all()` |
| AC3 | `yarn harness:test` › `BadListReadComponent.ts.fixture` (each method once outside `withHealing()`) and `GoodListReadComponent.ts.fixture` (each method once inside) | Exact count `R1=14` in the bad fixture; `none` in the good fixture |
| AC4 | `yarn harness:test` | Exit code 0, every fixture `PASS`, including the 5 new/changed ones |
| AC5 | `yarn harness:check-arch --all` after the migration | No new R1 in `models/` or `test-flows/`; the only new entries outside them are `R1` in `tests/web/Day20.spec.ts:29` (`page.locator("div#content div.figure").all()`) and, see Q1, `tests/web/Day19.spec.ts:29` (`page.locator("//a").elementHandles()`). Expected set from a repo-wide search of the added method names in `SCANNED_DIRS` (`models/`, `test-flows/`, `tests/web/`): the only locator calls are the five migrated methods plus these two lines; Verification step 1 re-runs that search before the edit. `yarn harness:check-arch` on the changed `models/` files passes |
| AC6 | Not automated: proving the failure path needs a deliberately broken production selector; covered by the design table under Changes by Layer and by code review (`waitFor({ state: "attached" })` inside the callback throws, `Component.withHealing()` catches and rethrows) | — |
| AC7 | `yarn harness:run-tests tests/web/Day25 tests/web/Day22/TestProductItemListComponent.spec.ts tests/web/Day23/TestProductItemListComponent.spec.ts tests/web/Day23/TestFooterFlow.spec.ts tests/web/Day24/TestFooterFlow.spec.ts`, before and after the change | Same per-test status in both `harness-results/tests/*.json` files (`TestComponentWithLogin` is skipped when no credential is set) |
| E1 | `yarn harness:test` › `GoodListReadComponent.ts.fixture` | `// expect: none` with `.all()` on a method parameter and on a value returned by another method (`this.rowList().all()`) |
| E2 | Not automated: same reason as AC6; `waitFor()` raises the Playwright `TimeoutError` inside the `withHealing()` callback, so the step fails with that error after the healing path, before any caller sees an empty list | — |

## Scenarios

1. Checker regression (`yarn harness:test`)
   - `BadListReadComponent.ts.fixture` → exactly 14 R1.
   - `BadListReadTestFlow.ts.fixture` (`this.page.locator(sel).all()` in a flow) → R1 and R3.
   - `BadListRead.spec.ts.fixture` (`page.locator(sel).all()` in a spec, `test` imported from `tests/fixtures/base.js`, title with `TAG`) → R1 and R4.
   - `GoodListReadComponent.ts.fixture` and the updated `GoodActionComponent.ts.fixture` → none.
   - All existing fixtures keep their result.
2. Gate on the repository (`yarn harness:check-arch --all`) → only the Day20 (and Day19, Q1) entries are new, for the human `--update-baseline`.
3. Behaviour unchanged (`yarn harness:run-tests`, Desktop Chromium) — same specs before and after:
   - `tests/web/Day25/` — computer build + `OrderTestFlow.verifyShoppingCart()` / remove-cart flows (`cartItemRowCompList()`, `unselectDefaultCheckbox()`) and cart cleanup (`BaseFlow.clearShoppingCart()` → `removeAllItems()`), each test starting from a fresh guest context (empty cart).
   - `tests/web/Day23/TestFooterFlow.spec.ts`, `tests/web/Day24/TestFooterFlow.spec.ts` — `FooterTestFlow.navigateToRandomMenuItem()` (`menuItemList()`, `subMenuItemList()`).
   - `tests/web/Day22/TestProductItemListComponent.spec.ts`, `tests/web/Day23/TestProductItemListComponent.spec.ts` — `ProductGridComponent.productItemComp()`.

## Reuse

- `Component.withHealing(selectorStr, action)` (`models/components/Component.ts`) unchanged — scopes the selector to `componentLocator` (`body` for pages via `BasePage`).
- `ShoppingCartPage.getCartItemRowCount()` — `withHealing(CartItemRowComponent.selectorValue, l => l.count())`, reused by `removeAllItems()` for the empty-cart check.
- `arch-check.ts` machinery unchanged: `locatorKind()` (resolves `locator`, `componentLocator`, local `const`/`let`, `CHAIN_PASSTHROUGH` = `first`, `last`, `nth`, `filter`, `and`, `or`; parameters and method results are `unknown` → E1 holds without new code), `insideWithHealingCallback()`, `SEMANTIC_LOCATORS` (`getByRole`, `getByLabel` → AC2 holds without new code), the baseline logic.
- Component selectors: `MenuItemComponent.selectorValue` (`>li`), `SubMenuItemComponent.selectorValue` (`ul>li`), `ProductItemComponent.selectorValue` (`div.product-item`), `CartItemRowComponent.selectorValue` (`.cart-item-row`), `ComputerEssentialComponent.allCheckboxSel`.
- Callers unchanged: `OrderTestFlow` (`verifyShoppingCart`, `removeCartItemsAndVerify`, `selectRemoveWithoutUpdateAndVerify`, `removeCartItemsWithFailedUpdateAndVerify`, `unselectDefaultCheckbox()` calls), `BaseFlow.clearShoppingCart()`, `FooterTestFlow.navigateToRandomMenuItem()`.

## Changes by Layer

### Spec
- None.

### TestFlow
- None.

### Page Object
- `models/pages/ShoppingCartPage.ts`
  - `cartItemRowCompList()` — list read through `this.withHealing(CartItemRowComponent.selectorValue, async l => { await l.first().waitFor({ state: "attached" }); return l.all() })`, then maps to `CartItemRowComponent` as today. Non-empty required: every caller (`OrderTestFlow` steps) reads a cart that has rows.
  - `removeAllItems()` — the empty-cart case moves before the list read: `if (await this.getCartItemRowCount() === 0) return`, then `cartItemRowCompList()`, `selectRemove()` per row and `clickOnUpdateCartBtn()` as today. Only `BaseFlow.clearShoppingCart()` calls it, already on `/cart`.

### Component
- `models/components/global/header/TopMenuComponent.ts` — `menuItemList()`: `withHealing(MenuItemComponent.selectorValue, async l => { await l.first().waitFor({ state: "attached" }); return l.all() })`. Non-empty required (the top menu always has items).
- `models/components/ProductGridComponent.ts` — `productItemComp()`: same pattern with `ProductItemComponent.selectorValue`. Non-empty required (a product grid is rendered only with products).
- `models/components/global/header/MenuItemComponent.ts` — `subMenuItemList()`: `withHealing(SubMenuItemComponent.selectorValue, l => l.all())`, no wait. Empty is valid: Books, Digital downloads, Jewelry and Gift Cards have no sub-menu, and `FooterTestFlow.navigateToRandomMenuItem()` branches on `length != 0`.
- `models/components/computer/ComputerEssentialComponent.ts` — `unselectDefaultCheckbox()`: `const checkboxCount = await this.withHealing(this.allCheckboxSel, l => l.count())`; for each index, `if (await this.withHealing(this.allCheckboxSel, l => l.nth(i).isChecked()))` then the existing `this.withHealing(this.allCheckboxSel, l => l.nth(i).click())`. Replaces `.all()` + `evaluate(el => el.checked)` on unwrapped array items. Empty is valid (no checkbox → nothing to unselect).

`waitFor({ state: "attached" })` keeps the current DOM-presence semantics of `.all()` (a hidden sub-list or a mobile-hidden menu still counts) and is bounded by the configured action timeout.

AC6 summary:

| Method | Empty list valid? | Handling |
|---|---|---|
| `ShoppingCartPage.cartItemRowCompList()` | No | wait for first row inside `withHealing()`; `removeAllItems()` checks `getCartItemRowCount()` first |
| `TopMenuComponent.menuItemList()` | No | wait for first item inside `withHealing()` |
| `ProductGridComponent.productItemComp()` | No | wait for first item inside `withHealing()` |
| `MenuItemComponent.subMenuItemList()` | Yes | `l.all()` inside `withHealing()`, no wait |
| `ComputerEssentialComponent.unselectDefaultCheckbox()` | Yes | `count()` / `nth(i).isChecked()` / `nth(i).click()` inside `withHealing()` |

### Test Data
- None.

### Config
- None.

### Harness
- `harness/checks/arch-check.ts`
  - `LOCATOR_ACTIONS` += `all`, `elementHandle`, `elementHandles`, `evaluateHandle`, `waitForFunction`, `ariaSnapshot`, `ariaSnapshotJSON`, `dispatchEvent`, `drop`, `highlight`, `normalize`.
    - Confirmed and added: each of these 11 is declared on `interface Locator` in `node_modules/playwright-core/types/types.d.ts` (installed `1.64.0-alpha`) and touches or resolves the matched elements. The AC3 fixtures use only these 11.
    - Considered but excluded: `hideHighlight` (exists, removes an overlay, does not resolve elements) and the locator-producing / pure calls (`locator`, `getBy*`, `first`, `last`, `nth`, `filter`, `and`, `or`, `visible`, `within`, `describe`, `description`, `contentFrame`, `frameLocator`, `page`, `toString`).
  - Comment above `LOCATOR_ACTIONS`: drop `all` from the locator-producing examples and say list reads (`all`) are reads.
  - `RULES.R1`: `"no-direct-css-action: act/read/list (all())/assert on a CSS/XPath locator only through withHealing() (getByRole/getByLabel may act directly)"`.
- `harness/checks/run-fixtures.ts` — header tokens accept an optional exact count, `R1=14`; a plain `R1` keeps today's meaning (at least one). The fixture passes when the rule sets match and every counted rule has exactly that many violations; the output line shows the counts. Existing fixtures are unaffected.
- `harness/checks/fixtures/models/components/BadListReadComponent.ts.fixture` (new) — `// expect: R1=14`: the 4 `.all()` cases of AC1 and one call outside `withHealing()` for each of the 10 other added methods, on `this.componentLocator.locator(this.rowSel)`.
- `harness/checks/fixtures/models/components/GoodListReadComponent.ts.fixture` (new) — `// expect: none`: `withHealing(sel, l => l.all())`, `withHealing(sel, async l => { await l.first().waitFor({ state: "attached" }); return l.all() })`, each added method inside a `withHealing()` callback, `this.componentLocator.getByRole("listitem").all()`, `this.componentLocator.getByLabel(this.label).all()`, `.all()` on a parameter and on `this.rowList()` (E1).
- `harness/checks/fixtures/test-flows/BadListReadTestFlow.ts.fixture` (new) — `// expect: R1, R3`.
- `harness/checks/fixtures/tests/web/BadListRead.spec.ts.fixture` (new) — `// expect: R1, R4`.
- `harness/checks/fixtures/models/components/GoodActionComponent.ts.fixture` — line `const rows = await this.componentLocator.locator(this.btnSel).all()` becomes `const rows = await this.withHealing(this.btnSel, l => l.all())` (it would now be R1).

### Docs
- `CLAUDE.md`, Gates and Guardrails: R1 summary → "R1 no CSS/XPath action, read, list read (`.all()`) or `expect()` outside `withHealing()`"; `yarn harness:test` line mentions the optional count (`// expect: R1=3`).

## Out of Scope

- `tests/web/Day20.spec.ts` (and `tests/web/Day19.spec.ts`, Q1): not edited; their new R1 entries are added by the human with `--update-baseline`.
- `harness/checks/arch-baseline.json` — not edited by the agent.
- Rules R2–R10; adding `visible` / `describe` / `within` to `CHAIN_PASSTHROUGH`.
- `Component.withHealing()`, `HealingEngine`, `ai/` — no new helper in `Component.ts`; each method writes its callback.
- Callers of the migrated methods (`OrderTestFlow`, `BaseFlow`, `FooterTestFlow`, Day22/Day23 specs).

## Risks

- `subMenuItemList()` and `unselectDefaultCheckbox()` accept an empty list, so a broken selector there still returns empty without healing (`FooterTestFlow` then clicks the top-level item; checkboxes stay checked and the price assertions in `OrderTestFlow` would catch it). Accepted because an empty result is legitimate for both.
- `removeAllItems()` counts rows right after landing on `/cart`; the page is server-rendered and `clearShoppingCart()` asserts the URL first, same timing as today's `.all()`.
- `unselectDefaultCheckbox()` switches from `evaluate(el => el.checked)` to `isChecked()`; for `input[type='checkbox']` both read the `checked` state, and `isChecked()` throws on a non-checkbox, which this selector excludes.
- The `--update-baseline` step is manual; until the human runs it, `yarn harness:check-arch --all` fails on the Day20 (and Day19) entries. `check-arch` without `--all` on changed files (what the hooks and runners use) is not affected because those specs are not changed.
- Specs with random data (`TestRandom*`, footer random menu) can differ between the before/after runs for reasons unrelated to this change; compare failures by cause, not only by status.

## Open Questions

- Q1: `tests/web/Day19.spec.ts:29` calls `page.locator("//a").elementHandles()`; with `elementHandles` added to R1 it becomes a second new R1 entry outside `models/`/`test-flows/`, which AC5 does not name. Plan: treat it like Day20 (no edit, human `--update-baseline`). Confirm, or drop `elementHandles` from the added set.
  → A: Keep `elementHandles`; Day19 and Day20 are baselined by the human with `yarn harness:check-arch --all --update-baseline` after implementation (2026-11-18).
- Q2: AC1/AC3 ask that *each* case be reported, but `run-fixtures.ts` compares only the set of rules. Plan: add the optional `R<n>=<count>` header syntax (small, backward compatible). Confirm, or prefer one fixture file per case with no runner change.
  → A: Add the optional `R<n>=<count>` syntax to `run-fixtures.ts` (2026-11-18).
- Q3: Who implements the plan? `/implement-plan` (and so `yarn agent:implement`) may not edit `harness/` or `CLAUDE.md`.
  → A: Claude implements it in an interactive session, following this plan, the gates and `yarn harness:run-tests`; then `yarn ai:review --mode code`. The `/implement-plan` edit scope stays unchanged (2026-11-18).

## Human Review Notes

## Verification

1. Before any edit (clean `main`): search `models/`, `test-flows/`, `tests/web/` for `.<method>(` of each of the 11 added names and confirm the only locator hits are the five migrated methods, `tests/web/Day19.spec.ts:29` and `tests/web/Day20.spec.ts:29` (otherwise record the extra file under Implementation Notes and stop for the human); `yarn harness:check-arch --all`, `yarn harness:test`, and `yarn harness:run-tests tests/web/Day25 tests/web/Day22/TestProductItemListComponent.spec.ts tests/web/Day23/TestProductItemListComponent.spec.ts tests/web/Day23/TestFooterFlow.spec.ts tests/web/Day24/TestFooterFlow.spec.ts` (baseline result file).
2. `yarn tsc --noEmit` — zero errors.
3. `yarn harness:test` — all fixtures pass, including the four new ones and the updated `GoodActionComponent`.
4. `yarn harness:check-arch` (changed files) — passes; `yarn harness:check-arch --all` — only the Day20 (and Day19, Q1) R1 entries are reported.
5. `yarn playwright test --list --config=playwright.config.web.js` — specs and data load.
6. `yarn harness:run-tests` with the same spec list as step 1 (Desktop Chromium) — same per-test results as the baseline. Compare the two `harness-results/tests/*.json` files test by test, including skip and failure reasons, with a focus on the Day25 cart flows and the `BaseFlow.clearShoppingCart()` cleanup (`removeAllItems()` count check, `cartItemRowCompList()` wait); record the comparison under Implementation Notes.
7. `yarn harness:check-scope implementation-plans/REQ-003-arch-check-locator-list-read.md`.

## Review Resolution

OpenAI plan review: `implementation-review/REQ-003-arch-check-locator-list-read.plan.md` — verdict `APPROVE_WITH_CHANGES`.

- F1 Accepted: verified the expected set. `arch-check.ts:10` scans only `models/`, `test-flows/`, `tests/web/`; in those, the 11 added names are called on locators only in the five migrated methods, `tests/web/Day19.spec.ts:29` (`elementHandles`) and `tests/web/Day20.spec.ts:29` (`all`). Other hits are outside the scan or not locators (`Promise.all` in `ShoppingCartPage.ts:45`, `page.waitForFunction` in `utils/`, `this.normalize` in `ai/`). AC5 row now states the requirement's boundary (no new R1 in `models/` / `test-flows/`) plus this expected list, and Verification step 1 re-runs the search before the edit and stops on an unexpected hit.
- F2 Rejected: by the plan contract, Relevant Files lists every file read for the design or changed (`ai/review.ts:359-361`, which also tells the reviewer not to report read-only entries); `check-scope` only requires changed files to be listed. The read-only ones are already named as not edited: `arch-baseline.json`, `Day19.spec.ts` and `Day20.spec.ts` under Out of Scope, `Component.ts` under Reuse / Out of Scope; `harness/agent/run-tests.ts` is read for how `harness:run-tests` writes the result files used by AC7.
- F3 Accepted: all 11 added names are checked to be declared on `interface Locator` in the installed `playwright-core/types/types.d.ts`. The Harness section now splits "Confirmed and added" from "Considered but excluded" and says the AC3 fixtures use only the 11 confirmed methods.
- F4 Accepted: Verification step 6 now compares the before/after result files test by test, including skip and failure reasons, with a focus on the Day25 cart flows and the `clearShoppingCart()` cleanup, and records the comparison in Implementation Notes.

## Implementation Notes

Implemented by Claude in an interactive session (Q3), not through `/implement-plan`.

Deviations:
- D1: The spec list from Verification steps 1 and 6 is run in two `harness:run-tests` calls. `tests/web/Day24/TestFooterFlow.spec.ts:7` uses `test.only` (baselined R8), so Playwright ran only its 15 tests and skipped the other four spec paths in the same call (first baseline run `harness-results/tests/2026-11-18T07-51-18-500Z.json`: 15 tests, all Day24). Day24 is run on its own; the other specs together. Day24 is not edited (exercise file, out of scope).

Pre-edit search (Verification step 1): the 11 added names are called on locators in `models/`, `test-flows/`, `tests/web/` only in the five migrated methods, `tests/web/Day19.spec.ts:29` (`elementHandles`) and `tests/web/Day20.spec.ts:29` (`all`), as the plan expected. Before the edit `yarn harness:check-arch --all` passed (87 files, 130 baselined) and `yarn harness:test` passed.

Gates: last run, after the final change.
- `yarn tsc --noEmit` — passed, 0 errors.
- `yarn harness:test` — passed, 13 fixtures: `BadListReadComponent` `R1=14`, `GoodListReadComponent` none, `BadListReadTestFlow` R1+R3, `BadListRead.spec` R1+R4, updated `GoodActionComponent` none, existing fixtures unchanged. With the header temporarily set to `R1=15` the fixture failed (`expected [R1=15], got [R1=14]`), header restored.
- `yarn harness:check-arch` (changed files) — passed, 5 files, 0 baselined violations.
- `yarn harness:check-arch --all` — exactly 2 new R1: `tests/web/Day19.spec.ts:29` `page.locator("//a").elementHandles()` and `tests/web/Day20.spec.ts:29` `page.locator("div#content div.figure").all()`, for the human `--update-baseline` (Q1).
- `yarn harness:check-scope implementation-plans/REQ-003-arch-check-locator-list-read.md` — passed, 13 changed files.
- `yarn playwright test --list --config=playwright.config.web.js` — passed, 70 tests in 14 files.

Tests: `yarn harness:run-tests` (Desktop Chromium, self-healing disabled), before and after the change, compared test by test (file + title + status): identical, no failures or skips in either run.
- `tests/web/Day24/TestFooterFlow.spec.ts` — before `harness-results/tests/2026-11-18T07-51-18-500Z.json`, after `harness-results/tests/2026-11-18T08-02-00-428Z.json`: 15 passed / 15 passed (`menuItemList()` / footer flow).
- `tests/web/Day25` (6 files, incl. remove-cart flows, `clearShoppingCart()` → `removeAllItems()`, `unselectDefaultCheckbox()`), `tests/web/Day22/TestProductItemListComponent.spec.ts`, `tests/web/Day23/TestProductItemListComponent.spec.ts`, `tests/web/Day23/TestFooterFlow.spec.ts` — before `harness-results/tests/2026-11-18T07-53-08-066Z.json`, after `harness-results/tests/2026-11-18T07-57-52-668Z.json`: 16 passed / 16 passed.

## Human Code Review Notes

## Code Review Resolution

OpenAI code review: `implementation-review/REQ-003-arch-check-locator-list-read.code.md` — verdict `APPROVE`, no findings (`C<n>`); no code change.

## Commit Message

```text
Implement REQ-003: arch-check R1 catches locator list reads

- R1 also flags .all() and 10 other DOM-touching Locator methods
  (elementHandles, dispatchEvent, ariaSnapshot, ...) on a CSS/XPath
  locator outside withHealing().
- harness:test fixtures accept an exact count (// expect: R1=14);
  new list-read fixtures.
- ShoppingCartPage, ProductGrid, TopMenu, MenuItem and
  ComputerEssential read element lists through withHealing(); lists
  that must not be empty wait for the first element, so a broken
  selector reaches healing.
- Day19 / Day20 R1 entries added to the baseline.

OpenAI code review: APPROVE, 0 findings. 16 Day22–25 tests passed.
```

## Relevant Files

- harness/checks/arch-check.ts
- harness/checks/run-fixtures.ts
- harness/checks/arch-baseline.json
- harness/checks/fixtures/models/components/GoodActionComponent.ts.fixture
- harness/checks/fixtures/models/components/BadActionComponent.ts.fixture
- harness/checks/fixtures/models/components/BadListReadComponent.ts.fixture (new)
- harness/checks/fixtures/models/components/GoodListReadComponent.ts.fixture (new)
- harness/checks/fixtures/test-flows/BadListReadTestFlow.ts.fixture (new)
- harness/checks/fixtures/tests/web/BadListRead.spec.ts.fixture (new)
- harness/agent/run-tests.ts
- CLAUDE.md
- models/components/Component.ts
- models/pages/ShoppingCartPage.ts
- models/components/ProductGridComponent.ts
- models/components/computer/ComputerEssentialComponent.ts
- models/components/global/header/TopMenuComponent.ts
- models/components/global/header/MenuItemComponent.ts
- models/components/global/header/SubMenuItemComponent.ts
- models/components/ProductItemComponent.ts
- models/components/cart/CartItemRowComponent.ts
- test-flows/BaseFlow.ts
- test-flows/computer/OrderTestFlow.ts
- test-flows/global/FooterTestFlow.ts
- tests/web/Day19.spec.ts
- tests/web/Day20.spec.ts
