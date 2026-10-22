---
paths:
  - "ai/**"
  - "models/ai/**"
  - "models/components/Component.ts"
  - "models/pages/BasePage.ts"
  - "models/pages/FailedLocatorManager.ts"
  - "tests/fixtures/**"
  - "config/framework.config.ts"
---

## AI Self-Healing — Critical

The self-healing pipeline is a core part of this framework.
Do not remove, bypass, or restructure it.

---

### Entry Points

There are two entry points into the healing pipeline:

**1 — Component Action Failure** (triggered from `Component.ts`)

Any CSS/XPath locator action goes through `Component.withHealing(selectorStr, action)`.
When the action fails:
- `ComponentFailureCollector.collect()` is called to gather artifacts
- `HealingEngine.handle()` is called with the resulting `FailureContext`

**2 — Assertion Failure** (triggered from `tests/fixtures/base.ts`)

When `expect()` fails and the error bubbles to the global fixture:
- `AssertionFailureCollector.isAssertionError(error)` checks whether it is a genuine
  Playwright assertion error (detected via the `matcherResult` property)
- If yes: `AssertionFailureCollector.collect()` is called to gather artifacts
- `HealingEngine.handle()` is called with the resulting `FailureContext`

Action errors re-thrown from `withHealing()` are NOT routed through assertion healing —
the `isAssertionError()` guard prevents double-routing.

---

### Failure Context Collection

**`ai/collectors/ComponentFailureCollector.ts`**
- Calls `FailedLocatorManager.set(selectorStr)` — records the failed locator (do not remove)
- Creates artifact folder: `artifacts/{browser}/{test_title}/`
- Copies component source file via `SourceCodeCollector.find(componentClassName)`
- Takes screenshot scoped to `componentLocator`
- Reads DOM via `componentLocator.innerHTML()`
- Writes `metadata.json`
- Returns `FailureContext` with `failureSource: "ACTION"`

**`ai/collectors/AssertionFailureCollector.ts`**
- Takes full-page screenshot (`page.screenshot({ fullPage: true })`)
- Reads full DOM via `page.content()`
- Uses `StackTraceParser` to find the source class from the error stack trace.
  Search priority: `models/components/` → `models/pages/` → `test-flows/` → `tests/`
- Uses the matched frame's own file path (`frame.sourceFile`) — accurate for inherited methods
- Only files under `models/` are eligible: if the frame is in `models/` and exists, copies it as `component.ts`
- Otherwise (no frame, frame in `test-flows/` or `tests/`, file missing): writes empty `component.ts` → AI returns MANUAL (safe fallback)
- Returns `FailureContext` with `failureSource: "ASSERTION"`, `failedLocator: ""`

---

### HealingEngine Lifecycle

`HealingEngine.handle(context, testInfo)` in `ai/HealingEngine.ts` owns the full healing
workflow. Neither `Component.ts` nor `base.ts` contains any healing logic beyond calling
this method.

On each call:
1. **Rerun guard** — if `HEALING_RERUN === "true"` (child process), return `SKIPPED` immediately
2. **Lock** — `HealingLock.acquire(sourceFile)` — atomic cross-process file lock.
   If already locked by another worker: return `SKIPPED`.
   Stale locks older than 5 minutes are removed automatically.
3. **Timeout extension** — `testInfo.setTimeout()` adds
   `frameworkConfig.healingTimeoutPerRetryMs × maxHealingRetries` (currently `60_000 × 1`)
   so AI analysis + rerun can finish. Skipped when the test has no timeout (`timeout = 0`).
   Applies to both ACTION and ASSERTION failures — `base.ts` does not extend the timeout itself.
4. **Retry loop** (up to `frameworkConfig.maxHealingRetries`, currently `1`):
   - `FailureAnalyzer.analyze(folder)` → `FailureAnalysis`
   - Attach AI response JSON to Playwright test report
   - If `patchType === MANUAL` → log root cause + reason, return `MANUAL` (no source change)
   - `AIResponseValidator.validate()` — requires `field`, `oldValue`, `newValue`, `rootCause`,
     `patchType`; gates on `patchConfidence ≥ 80`; `field` and `oldValue` must exist in the source file
   - `BackupManager.create(sourceFile)` — creates `.bak` backup
   - `PatchApplier.applyToSource()` — replaces `oldValue` → `newValue` in source
   - `PatchVerifier.verify()` — confirms old value gone, new value present
   - `TestCommandBuilder.build(metadata)` → `yarn playwright test --grep="..." --project="..." --headed --config=playwright.config.web.js`
   - `TestRerunner.run(command)` — spawns child process with `HEALING_RERUN=true` in env
     - Child passes → return `HEALED`, release lock
     - Child fails → `BackupManager.restore()`, try next attempt
5. Max retries exhausted → return `FAILED`, release lock

---

### AI Analysis Model (`models/ai/AIAnalysis.ts`)

```
rootCause:           LOCATOR_BROKEN | TIMING | ASSERTION | LOGIC
patchType:           LOCATOR | MANUAL
reason:              string
rootCauseConfidence: 0–100   confidence in the root cause classification
patchConfidence:     0–100   confidence in the proposed fix
                             = 0 when patchType = MANUAL
                             = rootCauseConfidence when rootCause = LOCATOR_BROKEN
field:               string  variable name in the component source
oldValue:            string  current locator value (exact match required)
newValue:            string  proposed replacement locator
strategy:            string
explanation:         string
```

---

### Healing Result (`models/ai/HealingResult.ts`)

```
status:               HEALED | MANUAL | FAILED | SKIPPED
rootCause?:           string
patchType?:           string
rootCauseConfidence?: number
patchConfidence?:     number
originalLocator?:     string
healedLocator?:       string
sourceFile?:          string
reason?:              string
retryCount:           number
```

---

### Outcome Handling

| HealingEngine result | Component.withHealing()           | base.ts fixture                      |
|----------------------|-----------------------------------|--------------------------------------|
| `HEALED`             | throws `SelfHealingSuccess`       | returns cleanly                      |
| `MANUAL`             | re-throws original action error   | re-throws original assertion error   |
| `FAILED`             | re-throws original action error   | re-throws original assertion error   |
| `SKIPPED`            | re-throws original action error   | re-throws original assertion error   |

`SelfHealingSuccess` thrown by `withHealing()` propagates to the global fixture in
`tests/fixtures/base.ts`, which swallows it — the test exits without a failure.

---

### Rules

- **Never remove** `FailedLocatorManager.set(selectorStr)` inside
  `ComponentFailureCollector.collect()`.
- **Never remove** `ComponentFailureCollector.collect()` from `withHealing()`'s catch block.
- **Never remove** `AssertionFailureCollector.isAssertionError()` guard from `base.ts` —
  it prevents action errors from being double-routed through assertion healing.
- **Never remove** `HealingLock` from `HealingEngine.handle()` — it is the only mechanism
  preventing concurrent workers from corrupting the same source file.
- **Never remove** `HEALING_RERUN=true` from `TestRerunner.run()` — it prevents the child
  process from triggering another healing loop, causing infinite recursion.
- **Never remove** `BackupManager.create()` or `BackupManager.restore()` — they are the only
  rollback mechanism if a patch or rerun fails.
- **Never remove** `PatchVerifier.verify()` — post-patch safety check.
- **Never remove** the `HEALING_RERUN` guard at the start of `HealingEngine.handle()`.
- **Never change** the stale lock timeout in `HealingLock` (currently 5 minutes) without explicit instruction.
- The healing timeout extension lives only in `HealingEngine.handle()` (value from
  `frameworkConfig.healingTimeoutPerRetryMs`) — do not add `testInfo.setTimeout()` for healing
  in `Component.ts`, `base.ts`, or collectors.
- `HealingEngine` is the **single** healing orchestrator — never add healing workflow logic
  to `Component.ts`, `base.ts`, or any other class.
- `AIResponseValidator` gates on `patchConfidence ≥ 80` — do not lower this threshold.
- Do not change `OPEN_ANALYSIS_MODEL` in `.env` (currently `gpt-5-mini`) or the system prompt in
  `ai/prompts/FailureAnalysisPrompt.ts` without explicit instruction.
- All artifact folder and file names must come from `config/framework.config.ts` — never
  hardcode paths.
- Artifact collection happens **before** any healing attempt — do not reorder this sequence.
- A patch must only change the failed locator — never modify surrounding code or test logic.
- Never automatically modify assertion expected values or business logic.
- When a self-healing patch may affect framework behavior beyond the failed locator,
  stop and ask for approval.
