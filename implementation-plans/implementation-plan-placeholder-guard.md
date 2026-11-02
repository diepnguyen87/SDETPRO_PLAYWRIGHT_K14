# Implementation Plan: Keep Locator Placeholders Intact During Self-Healing

## Objective

Some component locators are templates with placeholder tokens that are replaced at runtime, e.g.

```ts
private dynamicDropdownSel = "//label[contains(text(), 'dynamicText')]/parent::dt/following-sibling::dd[1]/select"
const sel = this.dynamicDropdownSel.replace('dynamicText', 'RAM')
```

When such a locator breaks, the AI sees the resolved locator (`... 'RAM' ...`) in the failure metadata and the template in the source. If it returns a `newValue` without the placeholder (e.g. hardcodes `'RAM'`), the patch can pass the rerun of the failing test while silently breaking every other caller of the template (Processor, other options).

Goal: a healing patch on a template locator must keep every placeholder token, or be rejected.

## Current behaviour

- `AIResponseValidator.validate()` checks required fields, `patchConfidence >= 80`, `patchType != MANUAL`, and that `field` and `oldValue` exist in the source. It does not look at `newValue` content.
- `PatchApplier.applyToSource()` replaces the first occurrence of `oldValue`; `PatchVerifier.verify()` checks the old value is gone and the new value is present.
- A validator error is caught in `HealingEngine.runSingleAttempt()`, the backup is restored, and the result is `FAILED` — so rejecting a patch in the validator is safe.
- `FailureAnalysisPrompt.ts` says nothing about placeholders.

## Placeholder convention

Placeholder tokens are named `dynamic<Name>` (camelCase, starting with `dynamic` followed by an uppercase letter): `dynamicText`, `dynamicIndex`, `dynamicSection`. They live only in class-property templates and are substituted with `.replace('dynamic<Name>', value)`.

Templates in use today:

| File | Field | Tokens |
|---|---|---|
| `models/components/computer/StandardComputerComponent.ts` | `dynamicDropdownSel` | `dynamicText` |
| `models/components/computer/ComputerEssentialComponent.ts` | `optionLabelSel` | `dynamicText` |
| `models/components/computer/ComputerEssentialComponent.ts` | `sectionOptionSel` | `dynamicSection`, `dynamicIndex` |
| `models/components/checkout/ShippingMethodComponent.ts` | `shippingMethodRadioSel`, `shippingMethodLabelSel` | `dynamicIndex` |

## Steps

### Step 1 — Deterministic guard in `AIResponseValidator` (core change)

Add check 6 after the existing checks:

```ts
// 6. Template locators: newValue must keep every placeholder token of oldValue
const placeholderPattern = /\bdynamic[A-Z][A-Za-z0-9]*\b/g
const oldTokens = (analysis.oldValue.match(placeholderPattern) ?? []).sort()
const newTokens = (analysis.newValue.match(placeholderPattern) ?? []).sort()
if (oldTokens.join(",") !== newTokens.join(",")) {
    throw new Error(`newValue must keep placeholder tokens [${oldTokens.join(", ")}] but has [${newTokens.join(", ")}]`)
}
```

- Same tokens with the same count, so the template keeps working for all callers.
- Non-template locators have no tokens on either side and pass unchanged.
- Does not lower the `patchConfidence >= 80` gate or touch any "Never remove" item.

### Step 2 — Prompt hint in `FailureAnalysisPrompt.ts` (requires explicit approval)

Add one rule under `## Output Rules`:

> Some locator fields are templates containing placeholder tokens named `dynamic<Name>` (e.g. `dynamicText`, `dynamicIndex`). They are replaced at runtime, so the failed locator in the metadata is the resolved value. Patch the template field and keep every placeholder token unchanged in `newValue`.

Step 1 alone guarantees safety (bad patches are rejected). Step 2 raises the chance the AI produces an acceptable patch instead of a rejected one. `.claude/rules/self-healing.md` forbids changing the system prompt without explicit instruction, so this step runs only if approved.

### Step 3 — Document the convention

- `CLAUDE.md` → `## Locators`: dynamic locators are class-property templates with `dynamic<Name>` tokens substituted via `.replace(...)`; never template literals or inline selectors in methods.
- `.claude/rules/self-healing.md` → `AIResponseValidator` section: mention the placeholder check.
- `.claude/skills/add-page/SKILL.md` step 3 and `.claude/agents/code-reviewer.md` checklist item 4: same convention.

### Step 4 — Verify

1. `tsc --noEmit`.
2. Validator check without OpenAI: a scratch `tsx` script calls `AIResponseValidator.validate()` against a temp copy of `StandardComputerComponent.ts` with crafted analyses:
   - keeps `dynamicText` → passes
   - hardcodes `'RAM'` (drops `dynamicText`) → throws
   - non-template field (`continueBtnSel`) → passes
3. Regression: `tests/web/Day25` and `tests/web/Day24/TestGenericComponent.spec.ts` on Desktop Chromium.
4. Optional, only with approval (calls OpenAI and lets the engine patch source with backup/restore): break `dynamicDropdownSel`, run `TestStandardComponent` and check the result is `HEALED` with the token kept, or `FAILED` with the placeholder error.

## Out of scope

- Changing `PatchApplier` / `PatchVerifier` or the confidence threshold.
- Rerunning every caller of a template after a patch (the rerun stays the single failing test).
- Converting other selectors to templates.

## Relevant Files

- ai/AIResponseValidator.ts
- ai/prompts/FailureAnalysisPrompt.ts
- ai/HealingEngine.ts
- ai/PatchApplier.ts
- ai/PatchVerifier.ts
- models/components/computer/StandardComputerComponent.ts
- models/components/computer/ComputerEssentialComponent.ts
- models/components/checkout/ShippingMethodComponent.ts
- .claude/rules/self-healing.md
- .claude/skills/add-page/SKILL.md
- .claude/agents/code-reviewer.md
- CLAUDE.md
