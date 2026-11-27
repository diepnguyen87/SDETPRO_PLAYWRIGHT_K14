# Implementation Plan: RAG Phase A — Qdrant Ingest and Search

First slice of RAG for this project. It builds the knowledge index and a search command only; test generation
(`ai/test-generation/`) and `knowledge-base/business-rules/` are later phases that reuse it.

## Objective

One command indexes the project knowledge into Qdrant, one command searches it, so retrieval quality can be checked before
anything is generated from it:

```
docker compose --profile rag up -d qdrant     → local Qdrant (not started by `docker compose up` or CI)
yarn rag:ingest [--recreate]                  → load sources → chunk → embed changed files only (OpenAI) → upsert into Qdrant
yarn rag:search "<query>" [--top <n>] [--type <type>]
                                              → embed the query → top-n chunks with score, source:lines, type, excerpt
```

RAG is a standalone CLI like `ai/review/review.ts`: it is never wired into `HealingEngine`, `Component`, fixtures or the harness runners.

## Decisions (2026-11-27)

| Topic | Decision |
|---|---|
| Vector store | Qdrant from the start (human choice), behind a `VectorStore` interface so the retriever does not depend on the client |
| Dependency | `@qdrant/js-client-rest` pinned to an exact version (`1.20.0`, latest at planning time); approved by the human with the Qdrant choice. No other new dependency |
| Qdrant server | Service `qdrant` in `docker-compose.yml` with `profiles: ["rag"]`, image `qdrant/qdrant` pinned to a version compatible with the client (Q1), port `6333`, volume `./.qdrant-data:/qdrant/storage`. Existing `playwright` service and all workflows unchanged |
| Configuration | From `.env` only: `QDRANT_URL` (default `http://localhost:6333` when unset), `OPEN_EMBEDDING_MODEL` (required, no default), `OPEN_API_KEY` (existing). The human adds the keys; Claude never reads `.env*` |
| OpenAI client | `ai/shared/aiClient.ts` reused unchanged (`client.embeddings.create`) |
| Sources (allowlist) | `knowledge-base/**/*.md` except `_TEMPLATE.md`; `tests/web/Day25/*.spec.ts`; `models/pages/*.ts`; `models/components/**/*.ts`; `test-flows/**/*.ts`; `config/pages.json`. Nothing else is read — never `.env*`, `.auth/`, `test-data/` (holds addresses and emails), Day19–24 exercises, `ai/`, `harness/` |
| Chunking | Markdown: one chunk per `## ` section, prefixed with the document title; `area` from the `- Area:` metadata line. TypeScript: parsed with the `typescript` compiler API (already a dependency) — specs: one chunk per `test(...)` call; classes: one chunk per method, prefixed with the class name, its `@selector` and its property declarations. `pages.json`: one chunk. Chunks over 6 000 characters are split by lines |
| Chunk payload | `source` (repo-relative), `type` (`requirement` · `business-rule` · `defect` · `knowledge` · `spec` · `page` · `component` · `flow` · `page-registry`), `area` (requirements only), `title`, `startLine`, `endLine`, `text`, `fileHash` (sha256 of the file), `chunkIndex` |
| Point id | Deterministic UUID from sha256 of `source` + `chunkIndex`, so a re-ingest overwrites instead of duplicating |
| Incremental ingest | Read `source` → `fileHash` of the stored points; unchanged file → skipped (no embedding call); changed file → delete its points, embed and upsert; file no longer a source → delete its points. Prints `added / updated / removed / unchanged` files and the number of embedded chunks |
| Collection | One collection `knowledge`, cosine distance, vector size taken from the first embedding. Existing collection with another size (embedding model changed) → error asking for `--recreate`, which drops and rebuilds it |
| Errors | Qdrant unreachable → "Qdrant is not running at <url>; start it with `docker compose --profile rag up -d qdrant`", exit 1. Missing `OPEN_EMBEDDING_MODEL` → error naming the key, exit 1. Empty query / unknown `--type` → usage, exit 2 |

---

## 1. `ai/rag/` (new)

- `RagTypes.ts` — `SourceDocument`, `Chunk`, `ChunkType`, `EmbeddedChunk`, `ScoredChunk`, `ChunkFilter`.
- `DocumentLoader.ts` — expands the allowlist globs from the project root, returns `{ source, type, content, fileHash }`; a path
  matching `.env` / `.auth` is rejected even if a glob would match it.
- `DocumentChunker.ts` — markdown and TypeScript chunking as decided above; pure functions, no I/O.
- `EmbeddingService.ts` — `embed(texts: string[]): Promise<number[][]>` in batches of 100 via `aiClient`; model from
  `OPEN_EMBEDDING_MODEL`.
- `VectorStore.ts` — interface: `ensureCollection(size, recreate)`, `listFileHashes()`, `deleteBySource(source)`, `upsert(chunks)`,
  `search(vector, topK, filter?)`.
- `QdrantStore.ts` — `VectorStore` on `@qdrant/js-client-rest`; payload index on `source` and `type` for the delete and filter calls.
- `Retriever.ts` — `retrieve(query, { topK, type? }): Promise<ScoredChunk[]>` (embed query → store search). Phase B (test generation)
  calls this.
- `ingest.ts` — CLI for `yarn rag:ingest`: load → diff hashes → chunk → embed → upsert / delete → summary.
- `search.ts` — CLI for `yarn rag:search`: prints `score | type | source:startLine-endLine | title` and the first 3 lines of each chunk.

## 2. Configuration and infrastructure

- `package.json`: dependency `"@qdrant/js-client-rest": "1.20.0"`; scripts `"rag:ingest": "tsx ai/rag/ingest.ts"`,
  `"rag:search": "tsx ai/rag/search.ts"`; `yarn.lock` updated by `yarn install`.
- `docker-compose.yml`: `qdrant` service as decided (read `.claude/rules/github-actions.md` first; no workflow change).
- `.gitignore`, `.dockerignore`: `.qdrant-data`.
- `.env` (human): `QDRANT_URL=http://localhost:6333`, `OPEN_EMBEDDING_MODEL=<model>` (Q2).

## 3. Documentation

- `CLAUDE.md`: short `## RAG (ai/rag/)` section — standalone, not part of self-healing; start Qdrant with the `rag` profile;
  `yarn rag:ingest` / `yarn rag:search`; sources are the allowlist only; keys from `.env`.
- `implementation-plans/agent-harness.md`: not changed (RAG is not a harness slice).

---

## Out of Scope

- Test generation, `knowledge-base/business-rules/`, `knowledge-base/defects/` content and their templates (phase B+).
- Qdrant in CI or in the Docker image; Qdrant auth / cloud.
- Indexing `test-data/`, Day19–24, `ai/`, `harness/`, `implementation-plans/`.
- Any change to self-healing, fixtures, Pages, Components, TestFlows or specs.

## Risks

- Client/server version mismatch: the client warns when versions differ — pinned compatible versions (Q1), checked at first run.
- Chunk quality decides retrieval quality: verified by the search checks below before phase B builds on it.
- Docker Desktop must be running for ingest/search; the error message says how to start Qdrant.
- Embedding cost: the corpus is a few hundred chunks, a full ingest costs a few cents at most; unchanged files are never re-embedded.

## Open Questions

- Q1: Qdrant server image pinned to the release matching the client (`qdrant/qdrant:v1.20.x`, exact tag checked on Docker Hub at
  implementation)? Plan: yes.
  → A: As planned (2026-11-27).
- Q2: Embedding model `text-embedding-3-small` (cheaper, 1536 dims) or `text-embedding-3-large` (3072 dims)? Plan: `small`; switching later
  only needs `--recreate`.
  → A: As planned (2026-11-27).
- Q3: Include `config/pages.json` and all Page / Component / TestFlow classes (useful for phase B to reuse existing steps), or only
  `knowledge-base/` + Day25 specs? Plan: include them.
  → A: As planned (2026-11-27).

## Verification

1. `yarn install` → lockfile updated, only `@qdrant/js-client-rest` and its dependencies added; `yarn tsc --noEmit`;
   `yarn harness:check-arch`; `yarn harness:test`; `yarn playwright test --list --config=playwright.config.web.js`.
2. `docker compose config` → `playwright` service unchanged; `docker compose config --services` lists only `playwright`;
   `docker compose --profile rag config --services` lists `playwright` and `qdrant`.
3. Qdrant stopped → `yarn rag:ingest` prints the start hint, exit 1. `yarn rag:search ""` → usage, exit 2.
4. `docker compose --profile rag up -d qdrant`; `yarn rag:ingest` → every source file `added`, chunk count printed; second run →
   all `unchanged`, 0 embedded; touch one requirement → only that file `updated`.
5. Retrieval checks (top 5):
   - "pay by check or money order at checkout" → REQ-002 and `PaymentMethodComponent` / `OrderTestFlow` checkout methods.
   - "remove items from the shopping cart" → REQ-001 and `TestRemoveCartItems.spec.ts` / `ShoppingCartPage`.
   - `--type spec "credit card checkout"` → only `spec` chunks, `TestStandardComponent.spec.ts` first.
6. `yarn rag:ingest` lists every indexed file; none is under `.env*`, `.auth/`, `test-data/`, `ai/`, `harness/` or Day19–24, and
   `_TEMPLATE.md` is absent.
7. `yarn harness:check-scope implementation-plans/rag-a-qdrant.md`.

## Relevant Files

- ai/rag/RagTypes.ts (new)
- ai/rag/DocumentLoader.ts (new)
- ai/rag/DocumentChunker.ts (new)
- ai/rag/EmbeddingService.ts (new)
- ai/rag/VectorStore.ts (new)
- ai/rag/QdrantStore.ts (new)
- ai/rag/Retriever.ts (new)
- ai/rag/ingest.ts (new)
- ai/rag/search.ts (new)
- ai/shared/aiClient.ts
- package.json
- yarn.lock
- docker-compose.yml
- .gitignore
- .dockerignore
- CLAUDE.md
- .claude/rules/github-actions.md
- knowledge-base/requirements/
- config/pages.json

## Verification Results (2026-11-27)

- Step 1: `@qdrant/js-client-rest@1.20.0` added (with `undici`, `@qdrant/openapi-typescript-fetch`); `tsc`, `harness:check-arch`,
  `harness:test` pass; `--list` → 70 tests in 14 files.
- Step 2: `docker compose config --services` → `playwright`; with `--profile rag` → `playwright`, `qdrant`. The obsolete `version: "3.9"`
  line was removed from `docker-compose.yml` (human request; Compose v2 ignores it and warned on every call, no workflow uses Compose).
  Server image `qdrant/qdrant:v1.20.2` (latest 1.20 tag, Q1).
- Step 3: Qdrant stopped → start hint, exit 1; `rag:search ""` / `--type foo` / `rag:ingest --bad` → usage, exit 2.
- Step 4: first ingest → 75 files added, 322 chunks (66 requirement, 116 component, 65 page, 60 flow, 14 spec, 1 page-registry; longest
  2 591 chars); second run → 75 unchanged, 0 embedded; one requirement changed → only that file `updated` (11 chunks), restored → `updated` again.
- Step 5:
  - "pay by check or money order at checkout" → top 5 all REQ-002 sections; with `--type component` → `PaymentMethodComponent.selectCheckMoneyOrder`
    first, `--type flow` → `OrderTestFlow.selectCheckMoneyOrderPaymentMethod` first.
  - "remove items from the shopping cart" → top 5 all REQ-001 sections (11 of top 12 are requirements); `--type page` →
    `ShoppingCartPage.removeAllItems`, `--type flow` → the `OrderTestFlow` remove methods, `--type spec` → the three `TestRemoveCartItems` tests.
  - `--type spec "credit card checkout"` → only spec chunks, `Test Credit Card Checkout` first — passed.
  - Finding: in an unfiltered search, natural-language requirement sections outrank code chunks (each section also carries the requirement
    title), so the "REQ + component/flow in one top 5" expectation is not met. Per-type retrieval finds the right code every time, so phase B
    retrieves per type (requirements, specs, flows / pages / components) instead of one mixed query.
- Step 6: the ingest list holds no file under `.env*`, `.auth/`, `test-data/`, `ai/`, `harness/`, Day19–24, and no `_TEMPLATE.md`.
