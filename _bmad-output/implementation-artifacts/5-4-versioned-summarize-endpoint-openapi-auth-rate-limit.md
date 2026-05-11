# Story 5.4: Versioned summarize endpoint with auth, rate limit, and OpenAPI

Status: done

<!-- Ultimate context engine analysis completed — comprehensive developer guide created -->

## Story

As an API consumer,  
I want a **`POST`** **`v1`** route under the existing report prefix that accepts a **JSON body** aligned with **`ReportUploadResponseDto`** semantics (`pageCount` + `sections[]` with `sectionName` and `observations[].text`),  
So that I can chain **upload → summarize** with minimal transformation (same object shape as upload success).

## Acceptance Criteria

1. **Given** Epic 1 **auth** (`ApiKeyGuard`) and **rate limiting** patterns,  
   **When** the new route is called **without auth** or **over quota**,  
   **Then** responses match existing structured error semantics (`requestId`, envelope shape, top-level `error.code` classification consistent with upload).

2. **Given** valid auth and a **well-formed** body matching upload success shape,  
   **When** summarization **succeeds**,  
   **Then** the HTTP response is **200** with **`ObservationSummaryResult`** JSON (`executiveSummary` + `prioritizedItems[]` per Story **5.3**).

3. **And** when the LLM adapter throws **`SummarizationProviderError`**, the API maps codes to **documented HTTP statuses and stable `details.code` values** (see Dev Notes matrix) so clients do not receive opaque **500** for known provider failures.

4. **And** **`GET /openapi.json`** documents **`POST /v1/report/summarize`**: `application/json` request body (upload-shaped), **200** response schema (**`$ref` → `ObservationSummary`**), and error responses aligned with runtime (**400**, **401**, **408**, **422**, **429**, upstream failure status — see tasks). Regenerate **`openapi/openapi.json`** and satisfy **`npm run openapi:check`**.

5. **And** **`docs/api/failure-matrix.md`** gains a **Summarize** section (matrix table + at least one copy-paste JSON example for success and one representative failure) consistent with the upload matrix style and fixture policy where applicable.

## Tasks / Subtasks

- [x] **Route + controller** (AC: #1–#2, #4)  
  - [x] Add **`POST /v1/report/summarize`** on [`ReportController`](../../homeinspection-api/src/modules/report/report.controller.ts) (`@Controller('v1/report')` already set).  
  - [x] Apply **`@UseGuards(ApiKeyGuard)`** (same as upload). **Do not** use `FileInterceptor`; body is JSON only.  
  - [x] Use **`@HttpCode(200)`** on success.  
  - [x] Accept **`ReportUploadResponseDto`** (reuse type from [`extraction-response.dto.ts`](../../homeinspection-api/src/modules/report/dto/extraction-response.dto.ts)); validate **before** calling the summarizer (see validation rules below).

- [x] **Rate limit** (AC: #1)  
  - [x] Register **`RateLimitMiddleware`** for **`POST`** **`v1/report/summarize`** in [`app.module.ts`](../../homeinspection-api/src/app.module.ts) alongside upload (same sliding-window behavior and env-driven **`RATE_LIMIT_*`** as [`rate-limit.middleware.ts`](../../homeinspection-api/src/common/middleware/rate-limit.middleware.ts)).  
  - [x] If tests reset rate-limit state, extend patterns that call [`resetRateLimitStateForTests`](../../homeinspection-api/src/common/middleware/rate-limit.middleware.ts) where needed.

- [x] **Service orchestration** (AC: #2–#3)  
  - [x] Inject **`AI_SUMMARIZER`** (`Symbol` from [`ai-summarizer.port.ts`](../../homeinspection-api/src/modules/report/summarization/ai-summarizer.port.ts)) into [`ReportService`](../../homeinspection-api/src/modules/report/report.service.ts) (mirror **`PDF_OBSERVATION_EXTRACTOR`** constructor style).  
  - [x] Add **`summarizeObservations(input: ReportUploadResponseDto, options?: { signal?: AbortSignal })`** delegating to **`AiSummarizer.summarize`**. Prefer **no** duplicate timeout unless you document why; **`OllamaSummarizerAdapter`** already enforces **`LLM_TIMEOUT_MS`**.

- [x] **HTTP error mapping** (AC: #1, #3)  
  - [x] Map **`SummarizationProviderError`** in the **controller** (same style as upload mapping `PdfExtractionError` / `UploadProcessingTimeoutError`) **or** in the service by throwing **`HttpException`** subclasses — pick **one** layer and stay consistent. Suggested mapping:

| `SummarizationProviderError.code` | HTTP | `details.code` (string) | Notes |
|-------------------------------------|------|---------------------------|--------|
| `INVALID_RESPONSE` | **422** | `SUMMARIZATION_INVALID_RESPONSE` | Malformed / schema-violating model output |
| `TIMEOUT` | **408** | `SUMMARIZATION_TIMEOUT` | Adapter timeout or abort; set **`retryable: true`** in details if appropriate |
| `HTTP_ERROR` | **502** | `SUMMARIZATION_UPSTREAM_ERROR` | Non-success from LLM HTTP; **do not** echo raw provider body in client `message` |
| `UNREACHABLE` | **502** | `SUMMARIZATION_UPSTREAM_ERROR` | Network / DNS / connection failures |

  - [x] Extend [`mapDetailCodeToTopLevelCode`](../../homeinspection-api/src/common/filters/http-exception.filter.ts) so **422** / **408** / **502** responses get **stable top-level `error.code`** values (today **422** without a mapped detail falls through to **`INTERNAL_ERROR`** — avoid that for summarize). Proposed top-level codes: **`SUMMARIZATION_FAILED`** (422), **`SUMMARIZATION_TIMEOUT`** (408), **`SUMMARIZATION_UNAVAILABLE`** (502). Add unit coverage in [`http-exception.filter.spec.ts`](../../homeinspection-api/src/common/filters/http-exception.filter.spec.ts) for the new detail codes.

- [x] **Request body validation** (AC: #1)  
  - [x] Reject invalid bodies with **`BadRequestException`** and **`details.code`** consistent with validation style (e.g. **`SUMMARIZATION_BODY_INVALID`** or reuse a small set of deterministic codes). Validate at minimum:  
    - `pageCount`: finite **integer** ≥ **0**  
    - `sections`: **array**; each section has non-empty trimmed **`sectionName`** (after trim, empty → reject or normalize per project convention — **document choice**; prefer **reject** for strict upload parity)  
    - each observation has **`text`** string with **trimmed length > 0**  
  - [x] Keep validation logic **framework-light** (project does not use `class-validator` on DTOs today).

- [x] **OpenAPI** (AC: #4)  
  - [x] Add **`@ApiOperation`**, **`@ApiSecurity('mockAuth')`**, **`@ApiBody`** (JSON schema mirroring upload **200** response shape), **`@ApiResponse`** 200 referencing **`#/components/schemas/ObservationSummary`**, and error responses using **`uploadErrorSchema`** / examples from [`upload.openapi.ts`](../../homeinspection-api/src/openapi/upload.openapi.ts) where they match; add summarize-specific examples where they differ (422 summarize, 502 upstream).  
  - [x] Run **`npm run openapi:generate`** and commit updated [`openapi/openapi.json`](../../homeinspection-api/openapi/openapi.json).

- [x] **Failure matrix + README pointer** (AC: #5)  
  - [x] Update [`docs/api/failure-matrix.md`](../../homeinspection-api/docs/api/failure-matrix.md): new heading for summarize, outcome rows, and JSON snippets.  
  - [x] Optionally add JSON fixtures under `test/fixtures/json/` **if** you extend e2e fixture contract tests; otherwise matrix-only is acceptable for **5.4** (Story **5.5** may add mock-LLM fixtures).

- [x] **Tests** (AC: #1–#4)  
  - [x] **Controller unit tests** ([`report.controller.spec.ts`](../../homeinspection-api/src/modules/report/report.controller.spec.ts)): auth failure, validation failure, success path with **`ReportService`** mocked to return a fixed **`ObservationSummaryResult`**, and at least one **`SummarizationProviderError`** mapping.  
  - [x] **Service unit tests** ([`report.service.spec.ts`](../../homeinspection-api/src/modules/report/report.service.spec.ts)) if present; else add focused **`report.service`** tests for wiring to **`AI_SUMMARIZER`**.  
  - [x] **E2E:** Add **`POST /v1/report/summarize`** cases only if CI can stay **deterministic** without a live LLM (e.g. module **override** of `AI_SUMMARIZER` in test module — may overlap **5.5**); if that would bloat scope, document “deferred to 5.5” in completion notes and still ship **unit** + **OpenAPI** coverage.

### Review Findings

- [x] **[Review][Patch]** Summarize **400** OpenAPI example: document **`SUMMARIZATION_BODY_INVALID`** (not upload PDF validation); add **`summarizeOpenApiExamples.bodyInvalid`** and point **`POST /v1/report/summarize`** `@ApiResponse` **400** at it.
- [x] **[Review][Patch]** Controller spec: assert **`SummarizationProviderError` `HTTP_ERROR`** maps to **502** with **`details.code: 'SUMMARIZATION_UPSTREAM_ERROR'`** and **`providerCode: 'HTTP_ERROR'`** (same envelope shape as **`UNREACHABLE`**).

## Dev Notes

### Scope boundaries (critical)

| In scope (5.4) | Out of scope (later) |
|----------------|----------------------|
| HTTP route, auth, rate limit, OpenAPI, error mapping, failure matrix | **Mock LLM** as default CI strategy for e2e (**5.5**) |
| Wire **`AI_SUMMARIZER`** into **`ReportService`** | Changing **Ollama** prompt/schema (**5.3** done) |
| Stable error envelope for summarize | MySQL / async persistence |

### Previous story intelligence (5.3)

- Structured result type and OpenAPI **components** already exist (**`ObservationSummary`**, **`PrioritizedObservationItem`** in [`summarization.openapi.ts`](../../homeinspection-api/src/openapi/summarization.openapi.ts) merged in [`app.setup.ts`](../../homeinspection-api/src/app.setup.ts)). **5.4** wires the **live path** and documents **`paths['/v1/report/summarize']`**.  
- Parser sorts **`prioritizedItems`** by **`rank`**; response is deterministic for clients.

### Pattern references (must mirror)

| Concern | Reference |
|---------|-----------|
| Upload auth + OpenAPI decorators | [`report.controller.ts`](../../homeinspection-api/src/modules/report/report.controller.ts) `uploadShell` |
| Rate limit path registration | [`app.module.ts`](../../homeinspection-api/src/app.module.ts) `configure` |
| Error envelope build / detail → top-level code | [`http-exception.filter.ts`](../../homeinspection-api/src/common/filters/http-exception.filter.ts) |
| Mock auth header in tests | [`ApiKeyGuard`](../../homeinspection-api/src/common/guards/api-key.guard.ts), e2e patterns in [`app.e2e-spec.ts`](../../homeinspection-api/test/app.e2e-spec.ts) |
| Summarization port | [`ai-summarizer.port.ts`](../../homeinspection-api/src/modules/report/summarization/ai-summarizer.port.ts), [`report.module.ts`](../../homeinspection-api/src/modules/report/report.module.ts) provider registration |

### Files to UPDATE (read before coding)

| File | Change |
|------|--------|
| [`report.controller.ts`](../../homeinspection-api/src/modules/report/report.controller.ts) | New `POST summarize` handler + OpenAPI + error mapping |
| [`report.service.ts`](../../homeinspection-api/src/modules/report/report.service.ts) | Inject `AI_SUMMARIZER`, add `summarizeObservations` |
| [`app.module.ts`](../../homeinspection-api/src/app.module.ts) | Rate limit route for summarize |
| [`http-exception.filter.ts`](../../homeinspection-api/src/common/filters/http-exception.filter.ts) | `mapDetailCodeToTopLevelCode` (and tests) for summarize detail codes |
| [`docs/api/failure-matrix.md`](../../homeinspection-api/docs/api/failure-matrix.md) | Summarize matrix + examples |
| [`openapi/openapi.json`](../../homeinspection-api/openapi/openapi.json) | Regenerated |

### Optional NEW files

- `homeinspection-api/src/modules/report/dto/summarize-request.validation.ts` (or colocate private validators in `report.service.ts`) — only if it keeps the controller thin.

### Architecture compliance

- Controllers stay thin: validation + HTTP mapping; LLM call in **service** via port.  
- Do **not** log full observation payloads at default log level (see Story **5.2** dev notes).  
- Preserve existing upload route behavior and OpenAPI for upload.

### Verification commands

```bash
cd homeinspection-api
npm test
npm run test:e2e
npm run openapi:check
npx eslint "{src,test}/**/*.ts"
```

## Project Structure Notes

- All report HTTP entrypoints remain under **`v1/report`** per Epic 1 shell.  
- Summarization stays behind **`AI_SUMMARIZER`**; **5.4** must not call `fetch` from the controller.

### References

- Epic text: [`epics.md`](../planning-artifacts/epics.md) Story **5.4**  
- Upload failure matrix: [`failure-matrix.md`](../../homeinspection-api/docs/api/failure-matrix.md)  
- Project context: [`project-context.md`](../project-context.md)

## Change Log

- **2026-05-10:** Story **5.4** completed (sprint status **done**); acceptance criteria satisfied after code review patches.
- **2026-05-10:** Code review patches: summarize-specific **400** OpenAPI example (`SUMMARIZATION_BODY_INVALID` via `summarizeOpenApiExamples.bodyInvalid`); `report.controller.spec.ts` coverage for **`HTTP_ERROR`** → **502** upstream envelope.
- **2026-05-11:** Implemented `POST /v1/report/summarize` with JSON body validation, `ReportService` + `AI_SUMMARIZER` wiring, controller error mapping, rate limit registration, OpenAPI + `openapi/openapi.json`, `http-exception.filter` top-level codes for summarize detail codes, failure matrix section, unit tests; e2e OpenAPI asserts summarize path. Live summarize e2e deferred to Story **5.5** (mock LLM).

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

### Completion Notes List

- **`POST /v1/report/summarize`:** JSON body validated via `parseAndValidateSummarizeBody` (strict non-empty `sectionName` after trim); maps `SummarizationProviderError` to 422 / 408 / 502 with stable `details.code` values.
- **`http-exception.filter`:** `SUMMARIZATION_INVALID_RESPONSE` → `SUMMARIZATION_FAILED`, `SUMMARIZATION_TIMEOUT` → top-level timeout code, `SUMMARIZATION_UPSTREAM_ERROR` → `SUMMARIZATION_UNAVAILABLE`.
- **E2E:** OpenAPI contract test asserts `/v1/report/summarize` exists with `application/json` body and 200/502 responses. Full HTTP success/failure e2e for summarize **deferred to 5.5** (requires `AI_SUMMARIZER` test double to avoid live LLM).

### File List

- `homeinspection-api/src/modules/report/dto/summarize-request.validation.ts` (new)
- `homeinspection-api/src/modules/report/dto/summarize-request.validation.spec.ts` (new)
- `homeinspection-api/src/modules/report/report.controller.ts`
- `homeinspection-api/src/modules/report/report.controller.spec.ts`
- `homeinspection-api/src/modules/report/report.service.ts`
- `homeinspection-api/src/modules/report/report.service.spec.ts`
- `homeinspection-api/src/app.module.ts`
- `homeinspection-api/src/app.setup.ts`
- `homeinspection-api/src/common/filters/http-exception.filter.ts`
- `homeinspection-api/src/common/filters/http-exception.filter.spec.ts`
- `homeinspection-api/src/openapi/summarization.openapi.ts`
- `homeinspection-api/openapi/openapi.json`
- `homeinspection-api/docs/api/failure-matrix.md`
- `homeinspection-api/test/app.e2e-spec.ts`
- `homeinspection-api/README.md`
