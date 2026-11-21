# Plan Review: implementation-plans/REQ-005-healing-rerun-output-dir.md

- Verdict: **APPROVE_WITH_CHANGES**
- Model: gpt-5.3-codex
- Findings: REQUIRED_FIX 2, RECOMMENDED 1, VERIFICATION 0

## Summary

The plan is aligned with the requirement and current source structure, and the proposed implementation (new framework config key plus `--output` in `TestCommandBuilder`) is architecturally correct. Traceability is largely complete and the self-healing constraints are respected. However, there are a few plan-level issues that should be corrected before implementation to avoid policy/format violations and brittle verification steps.

## Findings

### F1 [HIGH] REQUIRED_FIX (AC1, AC3)

- File: `implementation-plans/REQ-005-healing-rerun-output-dir.md`
- Problem: The plan explicitly proposes adding a code comment inside `ai/TestCommandBuilder.ts` ("Own output folder: ..."). Project rules state not to add comments/docstrings to code unless changing code and keep minimal changes; this comment is not required for functionality and introduces unnecessary scope.
- Action: Remove the planned inline code comment addition from `ai/TestCommandBuilder.ts`; keep only the functional command change (`--output=...`).

### F2 [MEDIUM] REQUIRED_FIX (AC1, AC2, E2)

- File: `implementation-plans/REQ-005-healing-rerun-output-dir.md`
- Problem: Verification step 4 uses `tsx -e` imports with `.ts` file extensions (`./ai/TestCommandBuilder.ts`, `./config/framework.config.ts`), while project code conventions and runtime imports consistently use `.js` extension for TS sources. This can create environment-dependent execution issues and does not match repository conventions.
- Action: Update the one-off verification command to import via `.js` module specifiers (or use a small temp script file compiled via tsx that follows project import convention).

### F3 [LOW] RECOMMENDED (AC3)

- File: `implementation-plans/REQ-005-healing-rerun-output-dir.md`
- Problem: AC3 verification relies on `grep -n "test-results" ai/TestCommandBuilder.ts ai/HealingEngine.ts` with expected exit code 1. This is fragile and can fail if incidental strings or docs/comments appear, without proving the real requirement (no hardcoded output path in logic).
- Action: Refine AC3 verification to check for absence of hardcoded output path assignment in command-building logic (for example, assert command uses `frameworkConfig.healingRerunOutputFolder` in a `tsx` check) instead of raw string grep alone.

## Assumptions

- `config/framework.config.ts` is the intended central place for adding `healingRerunOutputFolder`, and no other config file currently defines rerun output paths.
- Using `path.posix.join(...)` for CLI argument construction is acceptable because the command targets Playwright CLI path parsing and keeps forward slashes across platforms.
- Manual AC4/E1 evidence is acceptable per requirement notes when OpenAI credits are unavailable.

## Validation Checklist

- yarn harness:check-plan implementation-plans/REQ-005-healing-rerun-output-dir.md
- yarn tsc --noEmit
- yarn harness:check-arch ai/TestCommandBuilder.ts config/framework.config.ts
- Run the updated one-off `tsx` command to assert: `--output` exists, starts with `frameworkConfig.healingRerunOutputFolder + '/'`, and differs across repeated `build()` calls
- Run `yarn harness:run-tests tests/web/Day25/TestCheapComponent.spec.ts` to ensure no regression with healing disabled
- With healing enabled and a temporary broken locator, run `yarn playwright test tests/web/Day25/TestCheapComponent.spec.ts --config=playwright.config.web.js --project="Desktop Chromium"` and confirm: pass status on healed path, no `ENOENT`, `summary.json` healing outcome `HEALED`, and child output folder created under `test-results/healing-rerun/`
