# Implementation Plan: Harness A1 — Requirement and Plan Contracts

Part of `implementation-plans/agent-harness.md` (Slice A, stage 1–3).

## Objective

Give requirements and implementation plans a fixed, machine-checked format so later stages
(`/write-plan`, OpenAI review, human gate) can be chained by code.

---

## 1. Copilot prompt file (first)

`.github/prompts/write-requirement.prompt.md` — invoked in VS Code Copilot Chat as `/write-requirement <description>`.
Tells Copilot to read `requirements/_TEMPLATE.md`, pick the next free `REQ-<nnn>`, write
`requirements/REQ-<nnn>-<slug>.md`, give every acceptance criterion an `AC<n>:` id and every error case an `E<n>:` id,
never put secrets in the file, then run `yarn harness:check-req <file>` and fix every reported issue.

## 2. Requirement contract (existing template, kept)

`requirements/_TEMPLATE.md` (created with Copilot) is the format. File name `REQ-<nnn>-<slug>.md`.

`harness/checks/requirement-check.ts` — `yarn harness:check-req <file> [--json]`:
- file name and `- ID:` match `REQ-\d{3}` and each other; title line `# REQ-<nnn>: <Title>`
- Metadata has `ID`, `Area`, `Source` (`manual` | `copilot`), `Author`
- required sections non-empty: Metadata, Goal, Scope (In Scope / Out of Scope), Preconditions, User Flow,
  Acceptance Criteria, Expected Results; Actors, Error Cases, Test Data, Notes must exist (may be empty)
- at least one `AC<n>:`; AC and `E<n>:` ids unique
- no leftover `<placeholder>` outside code spans
- no secrets: email addresses, card-like digit runs, `password:` / `api key` values

## 3. Plan contract

`implementation-plans/_TEMPLATE.md`:

```
# Implementation Plan: <Title>

Status: Draft
Requirement: requirements/REQ-<nnn>-<slug>.md

## Objective
## Acceptance Criteria Traceability
| ID | Covered by (spec › flow step) | Assertion |
## Scenarios
## Reuse
## Changes by Layer
### Spec / ### TestFlow / ### Page Object / ### Component / ### Test Data / ### Config
## Out of Scope
## Risks
## Verification
## Review Resolution
## Relevant Files
```

`Status` lifecycle: `Draft → Plan Reviewed → Awaiting Human Review → Approved → Implemented → Code Reviewed →
Awaiting Human Code Review → Accepted`, plus `Changes Requested` (set by the human).

`harness/checks/plan-check.ts` — `yarn harness:check-plan <file> [--json]`, only for plans with a `Requirement:` line
(older plans are skipped):
- valid `Status`; requirement file exists and passes requirement-check
- required sections present
- every `AC<n>` and `E<n>` of the requirement appears in the Traceability table; a row may say
  `Not automated: <reason>` instead of a spec step
- Relevant Files: entries without `(new)` exist; `(new)` entries do not exist yet and follow naming
  (`models/pages/*Page.ts`, `models/components/**/*Component.ts`, `test-flows/**/*TestFlow.ts`, `test-data/sit/**/*Data.json`);
  a new page requires `config/pages.json`, new test data requires `test-data/TestDataProvider.ts`
- from `Awaiting Human Review` onwards, `Review Resolution` is not empty

Both scripts: plain TypeScript run with `tsx`, no new dependency, exit code 1 on failure, shared markdown
section parser in `harness/checks/`. Two `harness:*` entries added to `package.json` scripts only.

## 4. Documentation

`CLAUDE.md`: short section on `requirements/`, the plan template, the `Status` lifecycle and the two checks.

---

## Verification

1. Typecheck clean.
2. `check-req` passes on `requirements/REQ-001-remove-cart-items.md`.
3. A hand-written plan for REQ-001 (scratchpad) passes `check-plan`.
4. Negative copies (scratchpad) fail with clear messages: missing AC in Traceability, `(new)` file that exists,
   new page without `pages.json`, email in requirement, leftover placeholder, duplicate AC id.
5. `check-plan` on the existing plans skips all of them.

## Out of Scope

- `ai/review.ts` handling of `(new)` entries in Relevant Files (A3).
- Validating `_TEMPLATE.md` files themselves (they are skipped by both checks).

## Relevant Files

- requirements/_TEMPLATE.md
- requirements/REQ-001-remove-cart-items.md
- .github/prompts/write-requirement.prompt.md (new)
- implementation-plans/_TEMPLATE.md (new)
- harness/checks/markdown.ts (new)
- harness/checks/requirement-check.ts (new)
- harness/checks/plan-check.ts (new)
- package.json
- CLAUDE.md
