---
paths:
  - ".github/workflows/**"
  - "Dockerfile"
  - "docker-compose.yml"
  - ".dockerignore"
---

## GitHub Actions

Workflows live in `.github/workflows/`. `smoke-github-hosted-worker.yml` is self-contained (all steps inline, no reusable workflow). The other smoke workflows delegate to reusable workflows in `diepnguyen87/automation-workflows` (pinned to a full commit SHA with a `# main` comment — bump the SHA in every caller after changing that repo):
`smoke-github-hosted-shard.yml` → `reusable-playwright-4.yml`; `smoke-github-hosted-matrix.yml` and `smoke-self-hosted.yml` → `reusable-playwright-2.yml`.

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `smoke-github-hosted-worker.yml` | manual (inputs `suite`: Smoke / Regression / Sanity, `environment`: SIT / UAT) | Single runner running all 5 browser projects (`workers: 5` overall, `workers: 1` per project in `playwright.config.web.js`, so one browser of each type runs at a time); a `prepare` job maps the suite to the yarn command plus `--project` flags |
| `smoke-github-hosted-shard.yml` | manual (inputs `suite`: Smoke / Regression / Sanity, `environment`: SIT / UAT) | Default project only (no `--project`; Desktop Chromium) split across 4 runners with `--shard=N/4 --workers=1 --fully-parallel --reporter=blob`; shard N uses `CREDENTIAL_INDEX=N-1`; a `merge-reports` job merges the blob reports into one HTML report |
| `smoke-github-hosted-matrix.yml` | manual (inputs `suite`: Smoke / Regression / Sanity, `environment`: SIT / UAT) | Matrix run of the selected suite across 5 browsers; a `prepare` job maps the suite to `test:smoke` / `test:regression` / `test:sanity` |
| `smoke-self-hosted.yml` | manual (input `environment`: SIT / UAT) | Mobile Chrome / Mobile Safari on self-hosted runner (`mobile`) |
| `real-android-workflow.yml` | manual | Real Android device on self-hosted macOS |
| `docker-image.yml` | push tag `v*` | Build & push Docker image to Docker Hub |
| `playwright-docker-build.yml` | manual | Build Docker image locally on the runner and run tests in it |
| `playwrigh-docker-pull.yml` | manual | Pull `181221/playwright-framework:latest` from Docker Hub and run tests |
| `sample-github-hosted-workflow.yml` | push/PR → `day-30`, manual | Sample: `yarn test` on GitHub-hosted runner |
| `sample-self-hosted-workflow.yml` | manual | Sample: run tests on self-hosted macOS runner |

The project uses Yarn 4 via Corepack (`packageManager` in `package.json`). A workflow that runs `yarn install` on the runner must call `setup-node` without `cache`, run `corepack enable`, then call `setup-node` again with `cache: yarn` before `yarn install --immutable`. The `Dockerfile` installs Yarn the same way, so workflows that run inside the image need no setup.

All smoke GitHub-hosted workflows include a `generate-index` job (`if: always()`) that regenerates the `gh-pages` report index after every run — do not remove it.
This job checks out `gh-pages` into `site/`, deletes the environment + suite's old report folder(s) (even if no new report was produced), downloads the run's report artifacts into `site/` (matrix: into `downloaded-reports/`, then moved to `site/{ENV}-{suite}-{browser}/`), and publishes via `peaceiris/actions-gh-pages` (`keep_files: false` — `site/` already holds every other report), sharing the `gh-pages-deploy-{repo}` concurrency group:
`smoke-github-hosted-matrix.yml` publishes `{suite}-*-report` as `{ENV}-{suite}-{browser}/`; `smoke-github-hosted-worker.yml` publishes `{ENV}-{suite}-report` as `{ENV}-{suite}-single-runner/`; `smoke-github-hosted-shard.yml` publishes `{suite}-sharded-report` as `{ENV}-{suite}-sharded/` (`{ENV}` = `SIT` / `UAT`).

Environment variables are supplied to CI from two sources, merged into one `.env` by the reusable workflows (`reusable-playwright-2/3/4.yml`) and by the inline `execute` job of `smoke-github-hosted-worker.yml`: the repo secret `ENV_FILE_BASE64` (base64 of the shared `.env`) and the GitHub Environment secret `ENV_FILE_BASE64_SIT` (environment `SIT`) or `ENV_FILE_BASE64_UAT` (environment `UAT`) (base64 of `.env.{env}`, including its `TEST_ENV=sit|uat` line). Callers pass `environment: ${{ inputs.environment }}`; the reusable job sets `environment:` so it can read the environment secret (a caller job that uses `uses:` cannot). Callers use `secrets: inherit` — GitHub only exposes environment secrets to a reusable workflow when the caller inherits secrets; explicit secret mapping leaves them empty. `smoke-github-hosted-worker.yml` needs no `secrets: inherit`: its `execute` job sets `environment:` itself and reads the secrets directly. The reusable workflows forward only the env file and `CREDENTIAL_INDEX` into the container (the worker's `execute` job forwards only the env file), so `TEST_ENV` must be inside the environment file. Never hardcode secrets in workflow files.
