# Implementation Plan: Harness C1 — `harness:clean` and Timestamped Logs

Part of `implementation-plans/harness-c-execute.md` (Slice C, sub-slice C1).

## Objective

Every execute run starts from clean inputs, and log lines can be ordered and matched to a run:

- `yarn harness:clean [--dry-run]` removes the generated run outputs: `artifacts/`, `logs/`, `test-results/`, `playwright-report/`,
  `allure-results/`, `allure-report/` (Slice C Q4).
- Winston log lines carry an ISO timestamp: `{"level":"info","message":"Building computer 1","timestamp":"2026-11-19T03:12:45.123Z"}`.

## Decisions (2026-11-19)

| Topic | Decision |
|---|---|
| What is removed | Exactly the six folders above, at the project root. Fixed list in the script, not configurable from the command line |
| What is never touched | `harness-results/` (run evidence the runners cite), `.auth/`, `implementation-review/`, `*.bak` and `*.healing.lock` next to the sources (`HealingLock` writes `<sourceFile>.healing.lock`, healing backups sit beside the component), anything tracked by git |
| Safety | Each target is resolved under `PROJECT_ROOT`; a target that is a symlink or tracked by git (`git ls-files <folder>` non-empty) is skipped with a warning instead of deleted |
| `--dry-run` | Lists each existing folder with its file count and size; deletes nothing |
| Missing folders | Not an error (already clean). The collectors and reporters recreate their folders (`ComponentFailureCollector` / `AssertionFailureCollector` use `mkdirSync(..., { recursive: true })`; Playwright and Allure create theirs) |
| Log format | `winston.format.combine(winston.format.timestamp(), winston.format.json())` in `LoggerManager.createLogger()`; file naming and the `getLogger(testInfo)` signature unchanged. JSON keeps the lines machine-readable for C2/C3 |
| Allure history | Clearing `allure-results/` drops the accumulated Allure history locally (accepted in Slice C Q4); CI is unaffected (fresh checkout) |
| Docker | `docker-compose.yml` mounts `./artifacts`; cleaning the host folder between runs is fine, the container recreates it |

---

## 1. `harness/agent/clean.ts` (new) — `yarn harness:clean`

```
//   yarn harness:clean [--dry-run]
const TARGETS = ["artifacts", "logs", "test-results", "playwright-report", "allure-results", "allure-report"];
```

For each target: skip if absent; skip with a warning if `fs.lstatSync().isSymbolicLink()` or `git ls-files -- <target>` lists files;
otherwise count files/bytes, then `fs.rmSync(target, { recursive: true, force: true })` unless `--dry-run`. Prints one line per target
(`removed artifacts/ — 42 files, 3.1 MB` / `would remove …` / `absent` / `skipped (tracked by git)`) and a total. Unknown option → exit 2.
Exit 0 otherwise.

## 2. `utils/LoggerManager.ts`

`createLogger()` adds `format: winston.format.combine(winston.format.timestamp(), winston.format.json())`. Nothing else changes.

## 3. Documentation and config

- `package.json`: `"harness:clean": "tsx harness/agent/clean.ts"`.
- `CLAUDE.md`: Gates and Guardrails — `yarn harness:clean [--dry-run]` line (what it removes and never touches); Debugging — clean before a
  run when artifacts or logs may be stale.
- `.claude/skills/debug-failure/SKILL.md` §0: stale inputs can be avoided by `yarn harness:clean` before the rerun; log lines now carry a
  `timestamp` to compare with the run.
- `implementation-plans/harness-c-execute.md`: C1 marked done.

---

## Verification

1. `yarn tsc --noEmit` — zero errors; `yarn harness:check-arch` and `yarn harness:test` pass.
2. `yarn harness:clean --dry-run` with existing outputs → lists the present targets with counts, deletes nothing (`ls` unchanged).
3. `yarn harness:clean` → the six folders are gone; `harness-results/`, `.auth/` and any `*.bak` / `*.healing.lock` are untouched
   (`ls` before/after); running it again prints `absent` for all and exits 0.
4. Safety: a scratch symlink named like a target inside a temporary copy is not followed — checked by running the script's target
   handler against a scratch directory (no repo folder is replaced by a symlink).
5. `yarn harness:clean --foo` → exit 2.
6. `yarn harness:run-tests tests/web/Day25/TestCheapComponent.spec.ts` after cleaning → passes; `logs/Desktop Chromium.Test_Cheap_Component.log`
   is recreated and every line has an ISO `timestamp`; `test-results/` and (on failure only) `artifacts/` are recreated as before.
7. `yarn playwright test --list --config=playwright.config.web.js` — specs load.

## Relevant Files

- harness/agent/clean.ts (new)
- utils/LoggerManager.ts
- package.json
- CLAUDE.md
- .claude/skills/debug-failure/SKILL.md
- implementation-plans/harness-c-execute.md
- ai/HealingLock.ts
- ai/collectors/ComponentFailureCollector.ts
- ai/collectors/AssertionFailureCollector.ts
- docker-compose.yml
- .gitignore
