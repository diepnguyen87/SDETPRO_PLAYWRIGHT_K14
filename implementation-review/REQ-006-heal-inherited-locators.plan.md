# Plan Review: implementation-plans/REQ-006-heal-inherited-locators.md

- Verdict: **APPROVE_WITH_CHANGES**
- Model: gpt-5.3-codex
- Findings: REQUIRED_FIX 1, RECOMMENDED 0, VERIFICATION 0

## Summary

The plan’s core approach is aligned with REQ-006 and project rules: resolving the declaring class in the inheritance chain at collector time is correct and keeps `Component.ts` unchanged as required. Traceability is mostly strong and maps AC/E cases to concrete checks, including manual verification for healing-on behavior. However, one required inconsistency in the verification path conflicts with the plan’s own AC4 assertion source and should be corrected before implementation.

## Findings

### F1 [HIGH] REQUIRED_FIX (AC4)

- File: `implementation-plans/REQ-006-heal-inherited-locators.md`
- Problem: AC4 assertions rely on `harness-results/summary.json` healing outcome (`HEALED`), but the planned command in Verification step 6 runs plain `yarn playwright test ...` without ensuring the summary reporter is active. In this repo, `harness-results/summary.json` is guaranteed by configured reporters/harness flows; relying on it from an ad-hoc direct run is not reliably proven by the plan itself.
- Action: Amend AC4 verification to use an execution path that deterministically writes `harness-results/summary.json` (e.g., `yarn agent:execute --spec ...` with no tracked-file edits, or explicitly document and verify the reporter configuration that produces summary.json for the chosen direct command). If local locator break is required, adjust the assertion source to artifacts/logs that are guaranteed for that command and remove hard dependency on summary.json.

## Assumptions

- `harness-results/summary.json` is not guaranteed for every plain `yarn playwright test` invocation unless the configured reporter set includes the summary reporter for that run mode.
- No additional hidden repository files modify reporter behavior beyond the provided sources.

## Validation Checklist

- yarn harness:check-plan implementation-plans/REQ-006-heal-inherited-locators.md
- Confirm AC4 verification command and evidence source are consistent: command used must produce all asserted artifacts/files.
- After implementation: yarn tsc --noEmit
- After implementation: yarn harness:check-arch ai/SourceCodeCollector.ts ai/collectors/ComponentFailureCollector.ts
- .claude/rules/self-healing.md updated exactly in Failure Context Collection to describe `findDeclaring(...)` behavior per AC5.
- Run resolver checks (AC1–AC3, E1–E3) and confirm probe files are cleaned up.
