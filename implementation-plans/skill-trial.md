# Implementation Plan: Trial Run of `/add-test-data` and `/debug-failure`

## Objective

Exercise the two project skills on real cases to confirm they lead to the right files and
the right conclusions, and record any gap in their `SKILL.md` as a follow-up proposal.

---

## Part A — `/add-test-data` (done, commit `9748c2e`)

**Case:** `OrderTestFlow.checkoutCompleted()` hardcoded the order completed title and the
order detail link text.

**Steps**
1. Run `/add-test-data` with the request "move the order completed expected texts into test data".
2. Create `test-data/sit/checkout/OrderCompletedData.json` (`title`, `orderDetailLinkText`).
3. Register `orderCompleted` in `test-data/TestDataProvider.ts`.
4. Read it in `OrderTestFlow` through `testData.orderCompleted` (same pattern as `termsOfServiceWarningData`).
5. Verify: typecheck, `--list`, run `tests/web/Day25/TestStandardComponent.spec.ts` on Desktop Chromium.

**Result:** passed (no healing, no source patch). Skill guided every step correctly.
Possible addition: step 6 of the skill only asks for typecheck + `--list`, not for running a test
that consumes the new data. `test-data/uat/checkout/OrderCompletedData.json` is needed once UAT is activated.

---

## Part B — `/debug-failure` on a deliberately broken test

### Preparation (every scenario)
Delete stale inputs so the skill cannot read an older run:
- `artifacts/Desktop Chromium/_Smoke_Test_Standard_Component/`
- `logs/Desktop Chromium.Test_Standard_Component.log`
- `test-results/`

### B1 — data break → ASSERTION, healing skipped (no OpenAI)
1. Change `message` in `test-data/sit/checkout/TermsOfServiceWarningData.json` temporarily.
2. Run with `HEALING_RERUN=true` (`HealingEngine` returns `SKIPPED`; artifacts are still collected).
3. Run `/debug-failure` with title "Test Standard Component", project `Desktop Chromium`, without telling it the cause.
4. Expected: reads `metadata.json` (`failureSource: ASSERTION`, empty `failedLocator`), notices the empty
   `component.ts`, reads `error-context.md` and the log, stops at step 3 (data), proposes fixing the JSON.

### B2 — locator break → ACTION, healing ON (OpenAI)
1. Change `checkoutBtnSel` in `models/components/cart/TotalComponent.ts` from `#checkout` to a non-existent id.
2. Run `tests/web/Day25/TestStandardComponent.spec.ts` normally (healing enabled: OpenAI call,
   `.bak` backup, `PatchApplier` may rewrite the selector, headed child rerun).
3. Run `/debug-failure` with title "Test Standard Component", project `Desktop Chromium`.
4. Expected: stops at step 1 (locator), reads `metadata.failedLocator`, `dom.html`, the scoped
   screenshot and `ai-response.json` (root cause, patch, confidence), and reports the healing outcome
   (HEALED / MANUAL / FAILED) and any source change made by the patch.

### Cleanup
`git restore` every deliberately broken file (and any healing patch), remove `.bak` files,
`git status` clean.

---

## Deliverables

- Part A commit on `main` (no push).
- Per-skill findings: files read correctly or not, stopped at the right step, gaps in `SKILL.md`
  (e.g. no warning about stale artifacts, no guidance for a run that ended `self-healed`).
- `SKILL.md` changes are a separate proposal, applied only after approval.

---

## Relevant Files

- .claude/skills/add-test-data/SKILL.md
- .claude/skills/debug-failure/SKILL.md
- test-data/TestDataProvider.ts
- test-data/sit/checkout/OrderCompletedData.json
- test-data/sit/checkout/TermsOfServiceWarningData.json
- test-flows/computer/OrderTestFlow.ts
- models/components/cart/TotalComponent.ts
- config/framework.config.ts
- utils/LoggerManager.ts
