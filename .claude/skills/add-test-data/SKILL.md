---
name: add-test-data
description: Add a new environment-specific test data JSON file and register it in test-data/TestDataProvider.ts. Use when a test or flow needs new input data.
---

# Add Test Data

## 1. Reuse before creating
Read `test-data/TestDataProvider.ts` and the files under `test-data/sit/`. If an existing key (`testData.login`, `testData.standardComputer`, …) already holds the data, reuse or extend it.

## 2. Create the JSON (SIT only)
- Create `test-data/sit/<Name>Data.json` (subfolder allowed, e.g. `test-data/sit/checkout/`).
- If the shape is non-trivial, add a type under `test-data/model/`.
- Never put credentials, emails, card numbers, addresses or API keys in JSON. Those belong in `.env.sit` / `.env.uat` and are read via `process.env`.

## 3. Register it
In `test-data/TestDataProvider.ts`:
- Add `import sit<Name> from "./sit/<Name>Data.json" with { type: "json" };` next to the other SIT imports.
- Add a camelCase key to `sitData` (e.g. `contactUs: sit<Name>`). `TestData` is derived from `sitData`, so the key becomes available as `testData.<key>`.

## 4. UAT
UAT has no test data yet (`dataSets.uat` is `undefined`). Do not create UAT files and do not register UAT. In your summary, note that `test-data/uat/<Name>Data.json` must be added when UAT is activated.

## 5. Use it
Specs and flows read the data only via `import { testData } from "../test-data/TestDataProvider.js"` → `testData.<key>`. Never import `test-data/{env}/*.json` directly, never use `require()`, never inline the data.

## 6. Verify
The typecheck hook must report no errors, and `yarn playwright test --list --config=playwright.config.web.js` must load.
