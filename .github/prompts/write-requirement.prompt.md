---
description: Write a requirement for this Playwright project in requirements/ using the project template, then validate it.
agent: agent
---

Write a requirement for: ${input:feature:Describe the feature or behaviour to test}

## Steps

1. Read [the requirement template](../../requirements/_TEMPLATE.md) and the existing files in `requirements/`.
2. Pick the next free id `REQ-<nnn>` (three digits, e.g. `REQ-002`) and create `requirements/REQ-<nnn>-<slug>.md`,
   where `<slug>` is a short kebab-case name. Do not edit `_TEMPLATE.md` or other requirements.
3. Fill every section of the template, keeping its headings and order:
   - `# REQ-<nnn>: <Title>` as the first line, and the same id in `- ID:`.
   - `- Source: copilot`, `- Area:` one of the areas in the template.
   - Every acceptance criterion as `- [ ] AC<n>: ...`, numbered from `AC1`, each one observable and verifiable in the UI.
   - Every error case as `- E<n>: When ..., the system ...`, numbered from `E1`.
   - Leave no `<placeholder>` text. If a section does not apply (Actors, Error Cases, Test Data, Notes), keep the heading and write `- None`.
4. Describe behaviour, not implementation: no locators, class names or code. Use the Playwright MCP only to check what the real page shows.
5. Never put credentials, email addresses, card numbers, addresses or API keys in the file.
6. Run `yarn harness:check-req requirements/REQ-<nnn>-<slug>.md` and fix every reported issue until it passes.
