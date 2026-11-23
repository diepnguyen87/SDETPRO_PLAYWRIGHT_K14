# REQ-006: Self-Healing Patches Locators Declared in a Parent Class

## Metadata
- ID: REQ-006
- Area: self-healing
- Source: manual
- Author: Claude

## Goal
When a CSS/XPath action fails inside `Component.withHealing()`, `ComponentFailureCollector.collect()` resolves the source file with `SourceCodeCollector.find(componentClassName)`, where `componentClassName` is `this.constructor.name`, the runtime (most-derived) class. When the failing selector is a field declared in a parent class, the copied `component.ts`, `context.sourceFile`, the validator, the lock, the backup and the patch all point at the child class, which does not contain the selector. Healing then always ends `FAILED` with `Old value not found in component source`, even when the AI proposes the right value. Seen in REQ-005 (D2): `BaseItemDetailComponent.addToCartSel` broken, the AI returned `input[id^='add-to-cart-button']` with confidence 95, but the patch was checked against `CheapComputerComponent.ts`. Affected today: `BaseItemDetailComponent` (`productPriceSel`, `addToCartSel`) and `ComputerEssentialComponent` (`allCheckboxSel` and the `dynamic<Name>` templates `optionLabelSel`, `sectionOptionSel`) used through `CheapComputerComponent` / `StandardComputerComponent`, plus any page selector declared in a parent page. Healing must use the source file of the class that declares the failing selector.

## Scope
### In Scope
- The ACTION entry point (`withHealing()` → `ComponentFailureCollector`): the source file used for `component.ts`, `FailureContext.sourceFile` and everything downstream (`AIResponseValidator`, `HealingLock`, `BackupManager`, `PatchApplier`, `PatchVerifier`) is the file of the nearest class in the runtime class's inheritance chain (runtime class first, stopping before `Component`) whose source declares the failing selector.
- A selector built from a `dynamic<Name>` template (`.replace('dynamicText', value)`) is matched to the class whose source holds the template.
- When no class in the chain declares the selector, the runtime class's file is used, as today.
- `.claude/rules/self-healing.md` (Failure Context Collection) describes how the source file is resolved.

### Out of Scope
- The ASSERTION entry point (`AssertionFailureCollector`, stack-trace based).
- The AI prompt, `FailureAnalysisPrompt`, the analysis model, `AIResponseValidator` rules (confidence ≥ 80, field / oldValue / placeholder checks), `HealingLock` timeout, `HealingEngine` flow and outcome handling.
- Selectors built with a template literal or inline in a method (not allowed by CLAUDE.md).
- Collecting the sources of several classes into one `component.ts`.
- REQ-005's rerun output folder.

## Preconditions
- Self-healing enabled (no `SELF_HEALING_DISABLED=true`) and `OPEN_API_KEY` with credits, for the end-to-end checks.
- Day25 specs pass with healing off (`yarn harness:run-tests`).

## Actors
- `Component.withHealing()` / `ComponentFailureCollector` / `HealingEngine` (test process).
- A human or `yarn agent:execute` running Playwright with healing on.

## User Flow
1. A test calls a component method; a CSS/XPath action on a selector declared in a parent class fails inside `withHealing()`.
2. The collector resolves the declaring class's source file and copies it as `component.ts`.
3. The AI proposes a patch; the validator checks it against that file.
4. The patch is applied to the declaring file (with its `.bak`), the rerun passes, and the outcome is `HEALED`.
5. A selector declared in the runtime class itself is handled exactly as before.

## Acceptance Criteria
- [ ] AC1: For `CheapComputerComponent` and the selector value of `BaseItemDetailComponent.addToCartSel`, the resolved source file is `models/components/BaseItemDetailComponent.ts`.
- [ ] AC2: For `CheapComputerComponent` and a value produced from the `ComputerEssentialComponent.optionLabelSel` template (e.g. `dynamicText` replaced by a processor name), the resolved source file is `models/components/computer/ComputerEssentialComponent.ts`.
- [ ] AC3: For a selector declared in the runtime class itself (e.g. `TotalComponent.checkoutBtnSel`, or the `continueBtnSel` of `BillingAddressComponent` that overrides the abstract field of `CheckoutStepComponent`), the resolved source file is the runtime class's file, as today.
- [ ] AC4: With `BaseItemDetailComponent.addToCartSel` locally broken and healing on, `tests/web/Day25/TestCheapComponent.spec.ts` ends passed with healing outcome `HEALED`; the patch and the `.bak` are in `models/components/BaseItemDetailComponent.ts`, `CheapComputerComponent.ts` is unchanged, and the artifact `component.ts` is a copy of `BaseItemDetailComponent.ts`.
- [ ] AC5: `.claude/rules/self-healing.md` describes the resolution (declaring class in the inheritance chain, template match, fallback to the runtime class).

## Expected Results
- A broken locator declared in a parent class is healed in that parent class's file, which fixes it for every subclass that inherits it.
- Healing of locators declared in the runtime class is unchanged.
- The healing lock and backup are taken on the file that is patched.

## Error Cases
- E1: When the failing selector is not found in any class of the chain, the runtime class's file is used (current behaviour), and the healing result is whatever the existing pipeline returns (e.g. `FAILED` with `Old value not found …`).
- E2: When the same selector value is declared in more than one class of the chain, the nearest class to the runtime class is used.
- E3: When the source file of a class in the chain cannot be found, that class is skipped; if none can be resolved, the existing error path applies (`[Component] Healing engine error`, original error re-thrown), never a crash of the test runner.

## Test Data
- None (Day25 specs; broken locators are local, uncommitted changes restored after each run).

## Notes
- Approach (decided by the human, 2026-11-23): (b) the collector side follows `extends <Name>` in the sources starting from the runtime class's file, so `models/components/Component.ts` is unchanged. Rejected: (a) `Component.withHealing()` passing the class chain (`Object.getPrototypeOf` walk) in the collector params. CLAUDE.md naming (one class per file, file name = class name) makes the chain resolvable through `SourceCodeCollector.find()`.
- Template match: a source string literal containing `dynamic<Name>` tokens matches the runtime selector when each token is treated as a wildcard; a plain literal matches by equality.
- AC1–AC3 and E1–E3 can be checked without a browser or OpenAI (one-off script on the resolver); AC4 needs OpenAI credits and a run with healing on (not `yarn harness:run-tests`), recorded as manual evidence if credits are unavailable.
- A patch to a parent class affects every subclass; it still changes only the failed locator, so it stays within the self-healing rule "a patch must only change the failed locator".
- `ai/`, `models/components/Component.ts` and `.claude/rules/` are self-healing pipeline files guarded by the PreToolUse hook; implement in an interactive session (as REQ-005).
