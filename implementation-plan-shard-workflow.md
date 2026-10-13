# Implementation Plan: Sharded Smoke Workflow (4 CI Runners, Default Browser)

## Objective

Add a new manual workflow, based on `smoke-github-hosted.yml`, that:

- runs the selected suite on the **default project only** (no `--project` flag; in
  `playwright.config.web.js` every project except `Desktop Chromium` has `default: false`)
- splits the tests across **4 GitHub-hosted runners** with `--shard=N/4`
- merges the 4 shard results into **one HTML report** and publishes it to `gh-pages`

Verified locally: without `--project`, `test:smoke` lists 4 tests and `test:regression` lists 17 tests,
all in `[Desktop Chromium]`.

---

## Constraints Found

| # | Finding | Impact |
|---|---|---|
| 1 | `reusable-playwright-3.yml` uploads a fixed artifact name `{suite}-report` and has no shard input | 4 parallel jobs would collide on the same artifact name → cannot be reused as-is |
| 2 | `reusable-playwright-2.yml` uses `--project="${browser}"` and names artifacts `{suite}-{browser}-report` | Same browser on all 4 shards → artifact name collision → cannot be reused as-is |
| 3 | `tests/fixtures/base.ts` picks the account as `CREDENTIAL_INDEX` if set, otherwise `workerInfo.parallelIndex`; `.env` has 5 accounts (`LOGIN_EMAIL_0..4`) | With `workers: 5` and no `CREDENTIAL_INDEX`, every shard uses accounts 0–4 at the same time → the shared server-side cart collides across runners |
| 4 | Each shard writes its own HTML report | Without merging, there would be 4 partial reports |
| 5 | `fullyParallel` is not set, so sharding splits by **file**. Regression per shard: 7 / 9 / **0** / 1 tests | Unbalanced, and shard 3 does nothing. With `--fully-parallel`: 5 / 4 / 4 / 4. No spec uses `describe.serial` or `describe.configure`, so it is safe |

---

## Design

### Credentials (no code change)

Each shard runs with **one worker** and **its own account**:

| Shard | `--shard` | `CREDENTIAL_INDEX` | Workers |
|---|---|---|---|
| 1 | `1/4` | `0` | 1 |
| 2 | `2/4` | `1` | 1 |
| 3 | `3/4` | `2` | 1 |
| 4 | `4/4` | `3` | 1 |

This uses the existing `CREDENTIAL_INDEX` mechanism, already used by the matrix workflow, so no
framework change is needed. Parallelism comes from the 4 runners instead of the workers.

### Reports: blob + merge

- Each shard runs with `--reporter=blob` and uploads `blob-report/` as `{suite}-blob-report-{N}`
- A `merge-reports` job downloads all `{suite}-blob-report-*` artifacts, runs
  `npx playwright merge-reports --reporter html ./all-blob-reports` inside the same Docker image
  (`181221/playwright-framework`, Playwright 1.64 — the same version that produced the blobs) and uploads
  `{suite}-sharded-report`
- `generate-index` publishes it as `{suite}-sharded/` on `gh-pages` (`keep_files: true`, same
  `gh-pages-deploy-{repo}` concurrency group)

Note: `--reporter=blob` on the CLI replaces the config reporters, so the shards produce no Allure
results. Allure results are not published by the existing workflows either.

---

## Changes

### 1. New reusable workflow — `diepnguyen87/automation-workflows/.github/workflows/reusable-playwright-4.yml`

Based on `reusable-playwright-2.yml`. Inputs: `command`, `suite`, `shard-index`, `shard-total`,
`credential-index`, `runner`, `image-tag`; the same 4 secrets.

Run step:

```bash
docker run --rm \
  --env-file .env \
  -e CREDENTIAL_INDEX \
  -v ${{ github.workspace }}/blob-report:/app/blob-report \
  181221/playwright-framework:${{ inputs.image-tag }} \
  yarn ${{ inputs.command }} --shard=${{ inputs.shard-index }}/${{ inputs.shard-total }} --workers=1 --fully-parallel --reporter=blob
```

Upload `blob-report` as `${{ inputs.suite }}-blob-report-${{ inputs.shard-index }}`
(`retention-days: 1`). Slack notification per shard, with the shard number in the message.

### 2. New caller workflow — `.github/workflows/smoke-github-hosted-shard.yml` (this repo)

- `workflow_dispatch` with the same `suite` input (Smoke / Regression / Sanity)
- `prepare` — same suite → command mapping as `smoke-github-hosted.yml`, **without** `--project`
- `execute` — `strategy.fail-fast: false`, matrix `include` of 4 entries
  (`shard: 1..4`, `credential_index: 0..3`) → `reusable-playwright-4.yml@main`
- `merge-reports` — `needs: execute`, `if: always()`: pull image, download
  `pattern: ${{ inputs.suite }}-blob-report-*` with `merge-multiple: true`, run `merge-reports` in Docker,
  upload `${{ inputs.suite }}-sharded-report`
- `generate-index` — copied from `smoke-github-hosted.yml`, `needs: merge-reports`, `if: always()`,
  downloads `{suite}-sharded-report` and publishes it to `{suite}-sharded/`

### 3. `CLAUDE.md`

Add the new workflow to the GitHub Actions table and to the delegation and report-publishing notes.

---

## Out of Scope

- `test:sanity` script (known missing; not part of this change)
- No change to `playwright.config.web.js`, `tests/fixtures/base.ts`, or the existing workflows

---

## Verification

1. Local: `npx playwright test --grep @regression --config=playwright.config.web.js --shard=1/4 --list`
   (and 2..4) with `--fully-parallel` — the 4 shards together cover all 17 tests, each test exactly once, Desktop Chromium only
2. CI: run the new workflow with `Regression` → 4 execute jobs + merge + publish succeed
3. Open `gh-pages/Regression-sharded/` → one report with 17 tests

---

## Relevant Files

- `.github/workflows/smoke-github-hosted.yml`
- `.github/workflows/smoke-github-hosted-matrix.yml`
- `playwright.config.web.js`
- `tests/fixtures/base.ts`
- `Dockerfile`
