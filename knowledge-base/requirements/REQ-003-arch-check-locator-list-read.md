# REQ-003: Architecture Check Catches Locator List Reads Outside withHealing()

## Metadata
- ID: REQ-003
- Area: harness
- Source: manual
- Author: Claude

## Goal
Close a gap in the architecture gate (`yarn harness:check-arch`, rule R1). R1 must catch every call that reads or acts on the DOM through a CSS/XPath locator outside `withHealing()`. Today it treats `locator.all()` as a locator-producing call, so `this.page.locator(sel).all()` passes the gate although it resolves the elements at call time and bypasses self-healing. The OpenAI code review of REQ-001 (finding C1 on `ShoppingCartPage.cartItemRowCompList()`) found this; the gate did not. The shared Page Objects and Components that use the pattern must then follow the rule, so the gate stays clean without adding them to the baseline.

## Scope
### In Scope
- R1 in `harness/checks/arch-check.ts` reports `.all()` on a CSS/XPath locator (direct, through a local variable, or through `first`/`last`/`nth`/`filter`/`and`/`or`) outside a `withHealing()` callback, like the actions R1 already lists.
- R1 also reports the other Playwright `Locator` methods that touch the DOM and are missing from its list today (for example `dispatchEvent`, `elementHandle`, `elementHandles`, `ariaSnapshot`, `highlight`); the plan lists the exact set, checked against the installed Playwright version.
- `.all()` on `getByRole()` / `getByLabel()` locators stays allowed.
- Regression fixtures in `harness/checks/fixtures/` for the new cases, run by `yarn harness:test`.
- Migrate the shared code that uses `.all()` on a CSS locator to go through `withHealing()`: `ShoppingCartPage.cartItemRowCompList()`, `ProductGridComponent`, `ComputerEssentialComponent`, `TopMenuComponent`, `MenuItemComponent`.
- Update the R1 description in `arch-check.ts` and the R1 summary in `CLAUDE.md`.

### Out of Scope
- `tests/web/Day20.spec.ts` (exercise file, already in the baseline for other R1 entries): its new R1 entry is added to the baseline by the human with `--update-baseline`.
- Other rules (R2–R10) and other exercise files (Day19–Day24).
- Changes to the self-healing pipeline (`ai/`, `Component.withHealing()`, `HealingEngine`).
- Refactoring the callers of the migrated methods beyond what the migration needs.

## Preconditions
- `yarn harness:check-arch --all` and `yarn harness:test` pass on `main` before the change.
- The existing Day25 and shared specs that use the migrated methods pass on `main` (`yarn harness:run-tests`).

## Actors
- Framework maintainer or agent (Claude) writing Page Objects, Components, flows and specs.
- The architecture gate (`yarn harness:check-arch`), the PostToolUse hook and the harness runners that call it.

## User Flow
1. The author writes or changes a Page Object, Component, flow or spec that calls `.all()` (or another DOM-reading method) on a CSS/XPath locator outside `withHealing()`.
2. The author, the PostToolUse hook or a harness runner runs `yarn harness:check-arch` on the changed file.
3. The gate reports an R1 violation with the file, line and snippet, and exits non-zero.
4. The author moves the call into `this.withHealing(selector, l => ...)` (or uses a role/label locator) and runs the gate again.
5. The gate passes.

## Acceptance Criteria
- [ ] AC1: `this.page.locator(sel).all()`, `this.componentLocator.locator(sel).all()` and `.all()` on a local variable holding such a locator, outside a `withHealing()` callback, are each reported as R1 in a model, flow or spec file.
- [ ] AC2: `.all()` inside a `withHealing()` callback, and `.all()` on a `getByRole()` / `getByLabel()` locator, are not reported.
- [ ] AC3: Each additional DOM-touching `Locator` method in the plan's list is reported as R1 on a CSS/XPath locator outside `withHealing()` and not reported inside it.
- [ ] AC4: `yarn harness:test` includes fixtures for AC1–AC3 (one `// expect: R1` bad fixture and one `// expect: none` good fixture at least) and passes.
- [ ] AC5: After the migration, `yarn harness:check-arch --all` reports no R1 violation in `models/` or `test-flows/` that is not already in `harness/checks/arch-baseline.json`; the only new R1 entry outside them is in `tests/web/Day20.spec.ts`, left for the human baseline update.
- [ ] AC6: A migrated list read whose selector matches nothing fails through the `withHealing()` path (so self-healing can run) instead of silently returning an empty list, except where an empty list is a valid result; the plan states which methods may legitimately return an empty list and how they are handled.
- [ ] AC7: The existing specs that use the migrated methods (at least `tests/web/Day25/` and the specs using the header menu and product grid) pass through `yarn harness:run-tests` with the same results as before the change.

## Expected Results
- `yarn harness:check-arch` fails on a new `.all()` (or other DOM-reading) call on a CSS/XPath locator outside `withHealing()`, naming file, line and snippet.
- The shared Page Objects and Components read element lists only through `withHealing()`.
- `CLAUDE.md` and the R1 description name list reads (`.all()`) explicitly.
- No test behaviour changes; the cart, checkout, header and product-grid specs pass as before.

## Error Cases
- E1: When `.all()` is called on a locator whose kind the checker cannot resolve (for example a parameter or a value returned by another method), the gate does not report it, consistent with how R1 treats other actions on unresolved locators today (no false positive).
- E2: When a migrated list read's selector matches no element where at least one is expected, the step fails with the original Playwright error after the `withHealing()` path, not with an empty-list assertion later in the test.

## Test Data
- None (the checker is tested with fixture source files; the migrated code is tested with the existing specs and their data).

## Notes
- `Locator.all()` does not wait and returns `[]` when nothing matches, so wrapping it in `withHealing()` alone never triggers healing; AC6/E2 require the plan to choose how a missing list surfaces as a failure (for example waiting for the first element inside the `withHealing()` callback).
- `Component.withHealing()` scopes the selector to `componentLocator`; `BasePage` uses `body` as its root, so page-level selectors keep working.
- Only the human runs `yarn harness:check-arch --update-baseline` (CLAUDE.md, Gates and Guardrails).
