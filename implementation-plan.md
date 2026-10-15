# Implementation Plan: Separate SIT and UAT Test Environments

## Objective

Run the same web test suite against two environments — **SIT** and **UAT** — selected by a single
switch, `TEST_ENV` (`sit` | `uat`, default `sit`).

**Baseline rule:** every piece of data and every environment variable that exists today belongs to
**SIT**. After this change, running without `TEST_ENV` must behave exactly as today.

---

## Current State (verified)

| Area | Today | Problem for SIT/UAT |
|---|---|---|
| `playwright.config.web.js` (uncommitted edit) | Adds `TEST_ENV` + `baseURLs` map | **Config does not load.** `const baseURLs: Record<string, string>` is TypeScript syntax in a `.js` file → `SyntaxError: Missing initializer in const declaration (5:14)` (confirmed with `npx playwright test --list`). Also `use.baseURL` is still hardcoded, so the computed `baseURL` is never used. |
| UAT URL | `https://uat.demowebshop.tricentis.com` | Host does **not resolve** (`curl`: `Could not resolve host`). UAT cannot be run until a real URL is provided. |
| Env variables | One `.env` with: `OPEN_*`, `RANDOMMER_API_KEY` (environment-independent) and `LOGIN_EMAIL[_0..4]`, `LOGIN_PASSWORD[_0..4]`, `REGISTER_*` (environment-specific) | No way to have different accounts per environment. |
| Test data | `test-data/*.json`, `test-data/checkout/*.json`, imported statically by 9 files | Only one data set. |
| Hardcoded base URL | `url/Urls.ts`; `page.goto("https://demowebshop.tricentis.com/")` in 6 specs under `tests/web/Day22`, `tests/web/Day23` | Would still hit SIT when `TEST_ENV=uat`. |
| CI | Callers pass `secrets.ENV_FILE_BASE64`; reusable workflows (`automation-workflows` repo) decode it into `.env` and run `docker run --env-file .env ...` with only `-e CREDENTIAL_INDEX` passed through | No env selector; the only way to deliver `TEST_ENV` into the container without touching the reusable repo is inside the env file itself. |
| gh-pages | Folders `{suite}-{browser}/`, `{suite}-single-runner/`, `{suite}-sharded/` | SIT and UAT runs would overwrite each other's report. |

---

## Design

### 1. One source of truth for the environment — `config/environment.config.ts` (NEW)

```typescript
export const environments = {
    sit: { baseURL: "https://demowebshop.tricentis.com" },
    uat: { baseURL: "<UAT URL — to be confirmed>" },
} as const;

export type TestEnv = keyof typeof environments;

const requested = process.env.TEST_ENV ?? "sit";
if (!(requested in environments)) {
    throw new Error(`Unsupported TEST_ENV: ${requested}. Allowed: ${Object.keys(environments).join(", ")}`);
}

export const testEnv = requested as TestEnv;
export const envConfig = environments[testEnv];
```

Used by `playwright.config.web.js`, `url/Urls.ts` and `test-data/TestDataProvider.ts`, so the
`TEST_ENV` parsing and URL map exist in one place only. (This keeps the logic of the current
uncommitted config edit; it only moves it out of the `.js` file so it can be typed and reused.)

### 2. Environment variables — shared `.env` + per-environment `.env.{env}`

| File | Content | Loaded by |
|---|---|---|
| `.env` | `OPEN_ANALYSIS_MODEL`, `OPEN_REVIEW_MODEL`, `OPEN_API_KEY`, `RANDOMMER_API_KEY` (environment-independent) | existing `import "dotenv/config"` (AI tools, specs) — unchanged |
| `.env.sit` (NEW) | **all current** `LOGIN_*`, `LOGIN_EMAIL_0..4`, `LOGIN_PASSWORD_0..4`, `REGISTER_*` moved from `.env` | `playwright.config.web.js` |
| `.env.uat` (NEW) | same keys, UAT values (provided by user) | `playwright.config.web.js` |

In `playwright.config.web.js`:

```javascript
import dotenv from "dotenv";
import { testEnv, envConfig } from "./config/environment.config";

dotenv.config({ path: `.env.${testEnv}`, quiet: true });
```

- The config file is evaluated in the runner **and every worker**, so `process.env` is populated for
  `tests/fixtures/base.ts` (`LOGIN_EMAIL_${idx}`) and for specs.
- `dotenv` never overrides variables already in `process.env` → CI values (`--env-file`) always win,
  and a missing `.env.{env}` file is a silent no-op (CI has none).
- `dotenv` is already a dependency — no new package.
- `.gitignore`: add `.env.sit` and `.env.uat`.

### 3. Test data — `test-data/sit/`, `test-data/uat/`, `test-data/TestDataProvider.ts` (NEW)

Move (git mv, content unchanged) to `test-data/sit/`:

```
CheapComputer.json  LoginData.json  RandomCheapComputer.json  RandomStandardComputer.json
RegisterData.json   StandardComputer.json   checkout/BillingAddressData.json
checkout/ShippingMethodData.json            checkout/TermsOfServiceWarningData.json
```

`test-data/uat/` gets the same file set (initially a copy of SIT — see Open Questions #2).

Stays shared in `test-data/` (not environment data):
- `pages.json` — page-class registry used by `BaseFlow.createPageInstance()` (slugs, class names)
- `model/` — TypeScript types

`TestDataProvider.ts` keeps the mandated JSON-import style (static `with { type: "json" }` imports)
and only selects the set for the active environment:

```typescript
import { testEnv } from "../config/environment.config.js";
import sitStandardComputer from "./sit/StandardComputer.json" with { type: "json" };
import uatStandardComputer from "./uat/StandardComputer.json" with { type: "json" };
// ... one pair per file

const dataSets = {
    sit: { standardComputer: sitStandardComputer, /* ... */ },
    uat: { standardComputer: uatStandardComputer, /* ... */ },
};

export const testData = dataSets[testEnv];
```

Consumers change only their import line and the variable reference:

| File | Before | After |
|---|---|---|
| `test-flows/computer/OrderTestFlow.ts` | 3 `checkout/*.json` imports | `testData.billingAddress`, `testData.shippingMethod`, `testData.termsOfServiceWarning` |
| `tests/web/Login.spec.ts` | `LoginData.json` | `testData.login` |
| `tests/web/Register.spec.ts` | `RegisterData.json` | `testData.register` |
| `tests/web/Day25/TestCheapComponent.spec.ts` | `CheapComputer.json` | `testData.cheapComputer` |
| `tests/web/Day25/TestStandardComponent.spec.ts` | `StandardComputer.json` | `testData.standardComputer` |
| `tests/web/Day25/TestComponentWithLogin.spec.ts` | `StandardComputer.json`, `CheapComputer.json` | `testData.standardComputer`, `testData.cheapComputer` |
| `tests/web/Day25/TestRandomCheapComponent.spec.ts` | `RandomCheapComputer.json` | `testData.randomCheapComputer` |
| `tests/web/Day25/TestRandomStandardComponent.spec.ts` | `RandomStandardComputer.json` | `testData.randomStandardComputer` |
| `tests/real-android/TestStandardComponent.spec.ts` | `StandardComputer.json` | `testData.standardComputer` (path would break otherwise; Android always resolves to `sit`) |

No test logic, assertions or expected values change.

### 4. Remove hardcoded base URLs

- `playwright.config.web.js`: `use.baseURL: envConfig.baseURL`; delete the inline `baseURLs` map.
- `url/Urls.ts`: `baseURL = envConfig.baseURL` (only consumer: `tests/web/Day24/TestFooterFlow.spec.ts` — no change there).
- `page.goto("https://demowebshop.tricentis.com/")` → `page.goto("/")` in:
  `tests/web/Day22/TestSearchComponent.spec.ts`, `tests/web/Day22/TestProductItemListComponent.spec.ts`,
  `tests/web/Day23/TestFooterFlow.spec.ts`, `tests/web/Day23/TestSearchComponent.spec.ts`,
  `tests/web/Day23/TestProductItemListComponent.spec.ts`, `tests/web/Day23/TestFooterComponent.spec.ts`.
- `the-internet.herokuapp.com` / `foodandwine.com` URLs (Day19–22) are third-party practice sites — unchanged.

### 5. Local usage

```bash
yarn test:smoke                 # SIT (default)
TEST_ENV=uat yarn test:smoke    # UAT
```

No new `package.json` scripts: a cross-platform env prefix would need `cross-env` (new dependency).

### 6. CI (this repo only — no change to `automation-workflows`)

Because the reusable workflows only forward the env file and `CREDENTIAL_INDEX`, `TEST_ENV` is
delivered **inside the env file**:

| Secret | Content |
|---|---|
| `ENV_FILE_BASE64_SIT` (NEW) | base64 of `.env` + `.env.sit` + `TEST_ENV=sit` (= today's `ENV_FILE_BASE64` + `TEST_ENV=sit`) |
| `ENV_FILE_BASE64_UAT` (NEW) | base64 of `.env` + `.env.uat` + `TEST_ENV=uat` |

In `smoke-github-hosted-matrix.yml`, `smoke-github-hosted-worker.yml`, `smoke-github-hosted-shard.yml`,
`smoke-self-hosted.yml`:

- New input `environment` (choice `sit` | `uat`, default `sit`).
- `ENV_FILE_BASE64: ${{ inputs.environment == 'uat' && secrets.ENV_FILE_BASE64_UAT || secrets.ENV_FILE_BASE64_SIT }}`
- `generate-index`: publish to `{env}-{suite}-{browser}/`, `{env}-{suite}-single-runner/`, `{env}-{suite}-sharded/`
  (the `rm -rf` step uses the same new name). Artifact names are per-run, so they do not change.
- `run-name` includes the environment, e.g. `Smoke (uat)`, to tell runs apart in the Actions UI.

Notes:
- `ENV_FILE_BASE64` is used only by these 4 workflows; it can be deleted after the new secrets work.
- One-time cleanup: the old un-prefixed gh-pages folders (`Smoke-sharded/` etc.) are no longer
  removed by any job — delete them once from `gh-pages`.
- CI runs the Docker image `181221/playwright-framework:latest`, built by `docker-image.yml` on a
  `v*` tag. The new code reaches CI only after a new tag is pushed.

### 7. CLAUDE.md

Update: Technology/Test Data sections (`TEST_ENV`, `.env` + `.env.{env}`, `test-data/{env}/`,
`TestDataProvider`), the GitHub Actions table (`environment` input, `ENV_FILE_BASE64_{SIT,UAT}`),
and the gh-pages folder names in the `generate-index` paragraph.

---

## Self-Healing Interaction

No change to the healing pipeline.

- `TestRerunner.run()` spawns the child with `{ ...process.env, HEALING_RERUN: "true" }` → `TEST_ENV`
  is inherited, and the child loads the same `playwright.config.web.js` → the rerun uses the same
  environment as the failed run.
- `TestCommandBuilder` already passes `--config=playwright.config.web.js` — no change.
- Patches touch component/page locators only; those are environment-independent.
- `ai/aiClient.ts`, `ai/FailureAnalyzer.ts`, `ai/review.ts` keep reading `.env` — the `OPEN_*` keys stay there.

---

## Out of Scope

- `playwright.config.android.js` and `tests/real-android/*` inline `baseURL` — Android stays SIT-only.
- Docker workflows `playwright-docker-build.yml`, `playwrigh-docker-pull.yml`, sample workflows.
- `automation-workflows` reusable workflows.
- Pre-existing: workflows map `Sanity` → `yarn test:sanity`, but `package.json` has no `test:sanity` script.

---

## Decisions (answered by user)

1. **UAT URL** is fake (`https://uat.demowebshop.tricentis.com`) — the goal is a sample of environment separation.
2. **UAT test data** is not copied. `test-data/uat/` holds only `sample.json` so the folder can be committed.
   `TestDataProvider` registers no UAT data set and throws a clear error when `TEST_ENV=uat`
   (falling back to SIT data would silently break the separation).
3. **`.env.uat`** = the SIT values with a `uat_` prefix (`REGISTER_GENDER` kept as `male` — it is an option value, not account data),
   plus `TEST_ENV=uat`. `.env.sit` = the values moved out of `.env`, plus `TEST_ENV=sit`.
4. **gh-pages** folders prefixed for both environments: `SIT-…` / `UAT-…`. The workflow input values are `SIT` / `UAT`
   (uppercase, matching the folder prefix); the lowercase `TEST_ENV` comes from the env file.

---

## Verification

1. `npx tsc --noEmit` — compiles (catches wrong `testData` keys/import paths).
2. `npx playwright test --list --config=playwright.config.web.js` — config loads (fixes current `SyntaxError`); same test count as `main`.
3. `TEST_ENV=uat npx playwright test --list --config=playwright.config.web.js` — loads; `TEST_ENV=foo` → `Unsupported TEST_ENV` error.
4. `yarn test:login` and `yarn test:smoke --project="Desktop Chromium"` on SIT (no `TEST_ENV`) — pass, same as before.
5. Confirm `baseURL` in the HTML report / trace equals the SIT URL; with `TEST_ENV=uat`, the UAT URL (once Q1 answered).
6. `grep -rn "demowebshop.tricentis.com" tests/web url test-flows models` — no hits.
7. CI: run `smoke-github-hosted-worker.yml` with `environment=sit` → report at `sit-Smoke-single-runner/`.

---

## Relevant Files

- `playwright.config.web.js`
- `config/environment.config.ts` (NEW)
- `test-data/TestDataProvider.ts` (NEW)
- `test-data/sit/*`, `test-data/uat/*` (moved / NEW)
- `url/Urls.ts`
- `test-flows/computer/OrderTestFlow.ts`
- `tests/web/Login.spec.ts`
- `tests/web/Register.spec.ts`
- `tests/web/Day25/TestCheapComponent.spec.ts`
- `tests/web/Day25/TestStandardComponent.spec.ts`
- `tests/web/Day25/TestComponentWithLogin.spec.ts`
- `tests/web/Day25/TestRandomCheapComponent.spec.ts`
- `tests/web/Day25/TestRandomStandardComponent.spec.ts`
- `tests/real-android/TestStandardComponent.spec.ts`
- `tests/web/Day22/TestSearchComponent.spec.ts`, `tests/web/Day22/TestProductItemListComponent.spec.ts`
- `tests/web/Day23/TestFooterFlow.spec.ts`, `tests/web/Day23/TestSearchComponent.spec.ts`,
  `tests/web/Day23/TestProductItemListComponent.spec.ts`, `tests/web/Day23/TestFooterComponent.spec.ts`
- `tests/fixtures/base.ts` (reference: reads `LOGIN_EMAIL_${idx}` from `process.env`)
- `ai/TestRerunner.ts`, `ai/TestCommandBuilder.ts` (reference: env inheritance on healing rerun)
- `.github/workflows/smoke-github-hosted-matrix.yml`
- `.github/workflows/smoke-github-hosted-worker.yml`
- `.github/workflows/smoke-github-hosted-shard.yml`
- `.github/workflows/smoke-self-hosted.yml`
- `.gitignore`
- `CLAUDE.md`
