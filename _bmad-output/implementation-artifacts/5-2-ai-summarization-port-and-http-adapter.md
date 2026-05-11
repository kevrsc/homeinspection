# Story 5.2: AI summarization port and HTTP adapter

Status: review

<!-- Ultimate context engine analysis completed — comprehensive developer guide created -->

## Story

As an API maintainer,  
I want summarization implemented behind a domain/application **port** with an HTTP adapter (Ollama-native API, aligned with Story 5.1 sidecar),  
So that Nest controllers stay thin and LLM wiring stays replaceable and testable.

## Acceptance Criteria

1. **Given** configuration for base URL, model identifier, request timeout, and optional API key via environment variables (validated at boot with **safe defaults** so CI and developers without `.env` edits still start the API),  
   **When** application code invokes the summarization port with **normalized observation input** (same shape as upload success: `ReportUploadResponseDto` — `pageCount` + `sections[]` with `sectionName` and `observations[].text`),  
   **Then** the adapter calls the configured LLM HTTP API and returns **assistant text** (opaque string is sufficient for this story; Story **5.3** owns prompt + structured JSON parsing).

2. **And** provider/network failures, non-success HTTP status, malformed JSON, and **client-side timeouts** surface as **typed errors** (distinct subclasses or discriminated union) that a future controller/filter can map to the stable v1 error envelope without string matching (NFR6, NFR9).

3. **And** domain/application types for the port live **outside** Nest-specific imports (`@nestjs/common` decorators excluded from the port file is fine for Nest-agnostic interfaces; **do not** import `HttpService`, Express `Request`, or framework request types into the port contract file).

## Tasks / Subtasks

- [x] Define **`AiSummarizer`** (or equivalent name) **port** + injection **`Symbol`** in `src/modules/report/` (sibling to `extractors/`, e.g. `summarization/ai-summarizer.port.ts`) (AC: #1–#3)
  - [x] Method signature accepts `ReportUploadResponseDto` and optional `{ signal?: AbortSignal }` (mirror `PdfObservationExtractor`).
  - [x] Return type: `Promise<{ content: string }>` (or named type) — **raw** model text only for 5.2.
- [x] Add **typed failure types** (e.g. `SummarizationProviderError` with `code` enum: `UNREACHABLE`, `HTTP_ERROR`, `INVALID_RESPONSE`, `TIMEOUT`) — no stack traces in public payloads; mapping to HTTP happens in **5.4** (AC: #2).
- [x] Implement **`OllamaSummarizerAdapter`** (or similar) in the same folder implementing the port (AC: #1–#3)
  - [x] Use **`fetch`** (Node **20+** global; **no new HTTP dependency**).
  - [x] **POST** `{LLM_BASE_URL}/api/chat` with `Content-Type: application/json`, body `{ model, messages: [{ role: 'user', content: <serialized observations> }], stream: false }` per [Ollama API — Generate a chat completion](https://github.com/ollama/ollama/blob/main/docs/api.md) (verify `message.content` path on success).
  - [x] If `LLM_API_KEY` is non-empty, send `Authorization: Bearer <key>` (future OpenAI-compat / secured proxies).
  - [x] Serialize `ReportUploadResponseDto` to a compact, deterministic string for the user message (JSON stringified body is acceptable for 5.2; Story **5.3** replaces with real prompt).
  - [x] Respect **`AbortSignal`**: combine caller `signal` with timeout using **`AbortSignal.any`** when available, or `AbortController` + `setTimeout` pattern consistent with `ReportService` timeout style.
- [x] Extend **`validateEnv`** + **`getAppConfig`** / `AppConfig` for: `LLM_BASE_URL`, `LLM_MODEL`, `LLM_TIMEOUT_MS`, `LLM_API_KEY` (optional) with **defaults** so existing CI and `npm run start:dev` without LLM block still pass boot (AC: #1). Mirror values in **`.env.example`** (uncomment / document defaults).
- [x] Register adapter in **`ReportModule`** with `{ provide: AI_SUMMARIZER, useClass: OllamaSummarizerAdapter }` (AC: #1).
- [x] **Do not** add a public HTTP route, OpenAPI entry, or rate-limit path for summarize in this story — **5.4** only.
- [x] **Unit tests** for adapter: mock `global.fetch` to return synthetic Ollama JSON and assert parsed `content`; cases for 500 body, invalid JSON, timeout/abort (AC: #2). No live network in CI.

## Dev Notes

### Scope boundaries (critical)

| In scope (5.2) | Out of scope (later stories) |
|----------------|------------------------------|
| Port + Ollama HTTP adapter + env + DI registration | Prompt engineering, JSON schema enforcement (**5.3**) |
| Typed provider errors | HTTP route, guards, OpenAPI, failure matrix (**5.4**) |
| Unit tests with mocked `fetch` | E2E against real Ollama (**5.5** / manual) |

### Previous story intelligence (5.1)

- Ollama runs at **`http://127.0.0.1:11434`** per `docker-compose.yml` (loopback) and commented **`LLM_BASE_URL`** in `.env.example` — **use the same default** in `validateEnv` when unset.
- Compose pins **`ollama/ollama:0.23.2`**; README suggests **`llama3.2:1b`** model pull — default **`LLM_MODEL=llama3.2:1b`** aligns local smoke tests.
- Story **5.1** deliberately deferred **`env.validation.ts`** changes to **5.2** — this story **owns** LLM env validation + `AppConfig` extension.

### Pattern to mirror: PDF extractor

- Token: `PDF_OBSERVATION_EXTRACTOR` + interface in [`pdf-observation-extractor.port.ts`](../../homeinspection-api/src/modules/report/extractors/pdf-observation-extractor.port.ts).
- Injection in [`report.service.ts`](../../homeinspection-api/src/modules/report/report.service.ts) via `@Inject(PDF_OBSERVATION_EXTRACTOR)`.
- Module wiring in [`report.module.ts`](../../homeinspection-api/src/modules/report/report.module.ts).

Follow the **same Symbol + interface + useClass adapter** pattern for `AI_SUMMARIZER` (name is a suggestion; keep naming consistent and grep-friendly).

### Files to UPDATE (must read before coding)

| File | Current behavior | This story adds |
|------|------------------|-----------------|
| [`env.validation.ts`](../../homeinspection-api/src/config/env.validation.ts) | Auth, port, rate limits | Defaults + validation for `LLM_*` (defaults must allow boot without manual `.env` for LLM) |
| [`configuration.ts`](../../homeinspection-api/src/config/configuration.ts) | `AppConfig` without LLM | LLM fields read via `ConfigService` |
| [`.env.example`](../../homeinspection-api/.env.example) | Commented `LLM_BASE_URL` only | Full set: `LLM_MODEL`, `LLM_TIMEOUT_MS`, optional `LLM_API_KEY` with comments |
| [`report.module.ts`](../../homeinspection-api/src/modules/report/report.module.ts) | Extractor only | Register summarizer adapter |

**Preserve:** existing auth/rate-limit/env behavior for Phase 1; no regression on `validateEnv` error messages format.

### Architecture compliance

- Ports/adapters: application/domain must not depend on Nest HTTP types in the **port** file; adapter may use `fetch` only (infra).
- Project-context: no new dependencies without `package.json` update — **use native `fetch`**.
- Observability: optional `Logger` in adapter is acceptable; **do not** log full observation payloads at `log` level (PII-ish); prefer debug or structured truncation.

### Ollama HTTP contract (implementer must verify)

- **Endpoint:** `POST {LLM_BASE_URL}/api/chat`
- **Body (non-streaming):** include `"stream": false`.
- **Success:** response JSON includes assistant text (typically `message.content` — confirm against running Ollama or official docs before locking parser).
- **Errors:** HTTP 4xx/5xx; body may include `{ "error": "..." }` — map to `SummarizationProviderError` with stable `code`.

### Timeout budget

- Default **`LLM_TIMEOUT_MS`** suggestion: **`120000`** (2 min) — separate from upload **30s** SLO; document in `.env.example` that operators tune per model/hardware.
- On timeout: reject with typed **`TIMEOUT`** (or reuse a single code if you document the mapping clearly).

### Testing requirements

- **Jest** unit tests colocated `*.spec.ts` next to adapter or under `src/...` per existing layout.
- Mock **`global.fetch`** (or inject a minimal `fetch` delegate if you introduce a thin wrapper for testability — prefer mock `fetch` to avoid new abstractions unless necessary).
- Assert: happy path parses content; 404/500 maps to `HTTP_ERROR`; invalid JSON → `INVALID_RESPONSE`; abort → `TIMEOUT` or `UNREACHABLE` as designed.
- **No** `docker compose` in CI for this story.

### Library / framework requirements

- **NestJS 11**, **TypeScript 5.7** per [`package.json`](../../homeinspection-api/package.json).
- **No** `axios`, `@nestjs/axios`, or OpenAI SDK unless you document a strong reason in the story completion notes and update manifests (default: **forbidden**).

### PRD / product note (context only)

- PRD still lists AI as post-MVP growth; Epic 5 delivery is the active track — do not expand scope beyond the port + adapter.

### Project context reference

- `_bmad-output/project-context.md`: env-driven config, fail-fast, typed boundaries, no silent errors.

### Git intelligence summary

- Recent commits are mostly **web** (Epic 4); API patterns for this work come from **Epic 1–2** extractor/guard modules already in tree.

### Latest tech information

- **Node 20+** provides global **`fetch`** / **`AbortSignal.timeout`** (check runtime support in `engines` — project allows Node 22+; use patterns compatible with **20.18** baseline).
- **Ollama** local API base path **`/api/chat`** for chat completions; **`stream: false`** returns a single JSON object (not NDJSON).

### Questions saved for PO / later (do not block 5.2)

- Whether production will use **OpenAI-compatible** proxy vs raw Ollama — if yes, add a second adapter in a future story behind the same port.

## Change Log

- **2026-05-11:** Added `AiSummarizer` port, `SummarizationProviderError`, `OllamaSummarizerAdapter`, LLM env defaults + validation, `AppConfig` LLM fields, `ReportModule` registration, `.env.example` LLM block, unit tests with mocked `fetch`.

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

### Completion Notes List

- Implemented **`POST …/api/chat`** with `stream: false`, JSON user message = `JSON.stringify(ReportUploadResponseDto)`, `message.content` extraction.
- **Timeout:** `setTimeout` + merged `AbortController` with optional caller `signal`; **TIMEOUT** on `AbortError` or pre-aborted caller.
- **Env defaults:** `LLM_BASE_URL`, `LLM_MODEL`, `LLM_TIMEOUT_MS`, `LLM_API_KEY` (empty); invalid non-http(s) URL or bad timeout rejected at boot.
- **Tests:** 53 unit tests + 20 e2e pass; ESLint clean on `src`/`test`.

### File List

- `homeinspection-api/src/modules/report/summarization/ai-summarizer.port.ts` (new)
- `homeinspection-api/src/modules/report/summarization/ollama-summarizer.adapter.ts` (new)
- `homeinspection-api/src/modules/report/summarization/ollama-summarizer.adapter.spec.ts` (new)
- `homeinspection-api/src/config/env.validation.ts`
- `homeinspection-api/src/config/env.validation.spec.ts`
- `homeinspection-api/src/config/configuration.ts`
- `homeinspection-api/src/modules/report/report.module.ts`
- `homeinspection-api/.env.example`

## Code Review Findings (2026-05-11)

**Scope:** Story 5.2 implementation (port, Ollama adapter, env, module wiring, unit tests). **Verification:** `npm test` — 53 passed.

### Must fix before merge

_None._

### Should fix (non-blocking)

1. **Empty assistant content:** If Ollama returns `message.content` as `""`, the adapter returns `{ content: '' }`. Consider treating whitespace-only or empty string as `INVALID_RESPONSE` so callers do not assume non-empty text until Story 5.3 adds schema validation.

2. **`HTTP_ERROR` message body:** Error text includes up to 500 chars of the response body. That is useful for ops but can echo provider-specific or sensitive fragments; when 5.4 maps to the public envelope, ensure only a generic client message is exposed while logging detail server-side if needed.

### Nice to have / defer

3. **Payload size:** Full `JSON.stringify(input)` has no cap; very large reports could stress the LLM or hit proxy limits. Document or enforce a max in **5.3** / **5.4** as appropriate.

4. **`LLM_TIMEOUT_MS` upper bound:** Validation allows arbitrarily large timeouts; harmless but operators might typo extra digits. Optional sanity cap in a later hygiene pass.

### Acceptance cross-check

- **AC1–3:** Met (port contract clean of Nest HTTP types; adapter uses `fetch`; typed `SummarizationProviderError`; env defaults allow boot without LLM `.env` edits; no public summarize route).

### Blind / edge / auditor notes (triaged)

- **Blind:** Pre-aborted caller signal → `TIMEOUT` with clear message — acceptable; document if product wants a distinct code later.
- **Edge:** `new URL('/api/chat', baseUrl)` matches Ollama root base URL; unusual bases with required path prefixes are out of scope for this story.
- **Auditor:** `AI_SUMMARIZER` not yet injected into `ReportService` — intentional per story boundary (**5.4**).
