---
name: debug-failure
description: Investigate a failing Playwright test using artifacts, logs and a targeted rerun, and report the root cause before changing code. Use when a test fails or is flaky.
---

# Debug a Failing Test

Input: test title and browser project (e.g. `Desktop Chromium`). Ask for them if unknown.

Follow this order and stop at the first step that explains the failure. Report the root cause **before** changing any code.

## 1. Locator — artifacts
Folder: `artifacts/{browser}/{test_title}/` (title with non-word characters replaced by `_`, e.g. `_Smoke_Test_Standard_Component`). File names come from `config/framework.config.ts`:
- `screenshot.png` — look at it
- `dom.html` — check whether the failed locator exists and what replaced it
- `metadata.json` — failed locator, error, URL, failure source (ACTION / ASSERTION)
- `ai-response.json` — the self-healing analysis (root cause, patch, confidence), if healing ran
- `component.ts` — the source the analysis was based on
Also read `test-results/*/error-context.md` for the Playwright error and call log.

## 2. Logs
`logs/{browser}.{name}.log` (Winston, one file per browser + test), where `{name}` is the part of the title after the last `|`, trimmed, spaces replaced by `_` (see `utils/LoggerManager.ts`), e.g. `logs/Desktop Chromium.Test_Standard_Component.log`.

## 3. Test data
Check the JSON behind `testData.<key>` in `test-data/{env}/` and the active `TEST_ENV` (default `sit`).

## 4. Component action
Is the wrapped method correct (right locator, right action, awaited, inside `withHealing()` for CSS/XPath)?

## 5. Application behavior
Does the app actually behave as the test expects? Reproduce with a single rerun:
`yarn playwright test --grep="<title>" --project="<browser>" --config=playwright.config.web.js`

## 6. Environment and configuration
Browser project, env vars (`.env`, `.env.{env}`), `playwright.config.web.js`, `config/framework.config.ts`.

## Rules
- Do not assume the test is wrong before finishing the investigation.
- Never bypass `withHealing()`, change assertion expected values, or add `waitForTimeout` to make a test pass.
- Do not modify the self-healing pipeline; if the root cause is there, stop and ask.
- Report: failing step, evidence (file + excerpt), root cause category (locator / data / component / app / environment / config), and the proposed fix.
