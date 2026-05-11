# Story 5.6: API — Ollama adapter honors `LLM_BASE_URL` path prefix

Status: done

## Story

As an operator deploying the API behind a reverse proxy or non-root LLM path,  
I want **`LLM_BASE_URL`** to support **path segments** (for example `https://host/ollama` or a gateway prefix),  
So that the summarization adapter calls the correct **`/api/chat`** (or provider-equivalent) URL instead of silently dropping the configured path.

## Acceptance Criteria

1. **Given** **`LLM_BASE_URL`** includes a non-empty pathname (single segment or nested),  
   **When** the adapter builds the HTTP request URL for chat completion,  
   **Then** the pathname is **preserved and joined** correctly with the provider’s chat path (no **`new URL('/api/chat', base)`** behavior that discards the configured path unless explicitly documented and tested as intentional).

2. **And** unit tests cover at least: **base with path** + **base without path** + trailing slash normalization if applicable.

3. **And** **`homeinspection-api/README.md`** and **`.env.example`** describe path-capable **`LLM_BASE_URL`** and any constraints (e.g. no userinfo, HTTPS-only if enforced).

## Tasks / Subtasks

- [x] Fix URL construction in [`homeinspection-api/src/modules/report/summarization/ollama-summarizer.adapter.ts`](../../homeinspection-api/src/modules/report/summarization/ollama-summarizer.adapter.ts); add regression tests in [`ollama-summarizer.adapter.spec.ts`](../../homeinspection-api/src/modules/report/summarization/ollama-summarizer.adapter.spec.ts).
- [x] Docs and env template per AC **#3**.

## Dev Notes

### Source

**Edge Case Hunter** and **Blind Hunter** (**2026-05-11**): **`new URL('/api/chat', baseUrl)`** drops path prefix on **`LLM_BASE_URL`**.

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

### Completion Notes List

- Added **`buildOllamaChatRequestUrl`**: normalizes `LLM_BASE_URL` with a trailing slash then resolves relative **`api/chat`** so path prefixes (e.g. `/ollama`, gateway segments) are preserved; adapter uses it instead of **`new URL('/api/chat', base)`**.
- Unit tests: dedicated **`buildOllamaChatRequestUrl`** cases (origin-only, path without slash, with slash, nested path, trim) plus adapter integration test for **`…/ollama/api/chat`**.
- Documented path-capable **`LLM_BASE_URL`** in **`.env.example`** and **`README.md`** (http(s), no userinfo; use **`LLM_API_KEY`** for credentials).
- **`npm run test`** and **`npm run lint`** passed from **`homeinspection-api/`**.

### Implementation Plan

- Single exported helper next to adapter for testability and a single resolution rule used by **`summarize`**.

## File List

- `homeinspection-api/src/modules/report/summarization/ollama-summarizer.adapter.ts`
- `homeinspection-api/src/modules/report/summarization/ollama-summarizer.adapter.spec.ts`
- `homeinspection-api/.env.example`
- `homeinspection-api/README.md`

## Change Log

- **2026-05-11:** Story created from code-review follow-ups (`ready-for-dev`).
- **2026-05-10:** Implemented path-preserving **`/api/chat`** URL; tests + docs; status **`review`**; sprint **`5-6`** → **`review`**.
- **2026-05-10:** Acceptance criteria re-verified in codebase; sprint **`5-6`** → **`done`**; story status **`done`**.
