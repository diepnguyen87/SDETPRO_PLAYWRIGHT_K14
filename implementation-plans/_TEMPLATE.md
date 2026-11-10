# Implementation Plan: <Title>

Status: Draft
Requirement: requirements/REQ-<nnn>-<slug>.md

<!--
Status lifecycle (only the human sets Approved, Changes Requested and Accepted):
Draft → Plan Reviewed → Awaiting Human Review → Approved → Implemented → Code Reviewed
→ Awaiting Human Code Review → Accepted        (Changes Requested: sent back by the human)
Validate with: yarn harness:check-plan implementation-plans/<topic>.md
-->

## Objective

<What the change delivers, in two or three sentences.>

## Acceptance Criteria Traceability

Every AC<n> and E<n> of the requirement must have a row. Use `Not automated: <reason>` when a criterion is not covered by a test.

| ID | Covered by (spec › flow step) | Assertion |
|---|---|---|
| AC1 | <Spec title> › <FlowClass.method()> | <Web-first assertion> |
| E1 | Not automated: <reason> | — |

## Scenarios

<One table or list per test: steps and expected results.>

## Reuse

<Existing pages, components, flows and test data used as they are.>

## Changes by Layer

### Spec
### TestFlow
### Page Object
### Component
### Test Data
### Config

## Out of Scope

## Risks

## Open Questions

<One `- Q<n>: ...` per unknown; the human answers on the next line with `→ A: ...`. Write `- None` if there are none. The plan cannot be Approved while a question is unanswered.>

## Human Review Notes

<Optional, written by the human before setting Status: Changes Requested — one `- H<n>: ...` per requested change. Each is answered in Review Resolution as `- H<n> Done: ...` or `- H<n> Declined: ...`.>

## Verification

<Typecheck, `--list`, the specs to run and the project (Desktop Chromium by default).>

## Review Resolution

<Filled after the OpenAI review: one line per finding — Accepted (what changed) or Rejected (why).>

## Relevant Files

- <existing/file/path.ts>
- <new/file/path.ts> (new)
