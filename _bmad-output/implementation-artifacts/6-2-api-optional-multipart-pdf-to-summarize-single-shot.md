# Story 6.2: API — optional multipart PDF to summarize (single-shot)

Status: ready-for-dev

## Story

As an **API consumer** (integrator or thin client),  
I want to **`POST` a single PDF** to a summarize-class route and receive an **`ObservationSummary`** **without** a separate upload call,  
So that **“PDF → structured summary”** is one HTTP round-trip when the two-step JSON flow (`upload` then JSON `summarize`) is unnecessary or unavailable.

## Acceptance Criteria

1. **Given** a valid **PDF** (`application/pdf`, same validation posture as [`POST /v1/report/upload`](../../homeinspection-api/src/modules/report/report.controller.ts)),  
   **When** the client calls the **new or extended** summarize route with **`multipart/form-data`** and the same **`file`** field name as upload,  
   **Then** the server runs **extract → summarize** in-process: **`ReportService`** (or equivalent) obtains **`ReportUploadResponseDto`** via the existing **`PDF_OBSERVATION_EXTRACTOR`** path (**`extractPreview`** semantics), then calls **`summarizeObservations`** / **`AiSummarizer.summarize`** with that DTO.

2. **And** on **HTTP 200**, the response body matches **`#/components/schemas/ObservationSummary`** (same success contract as JSON **`POST /v1/report/summarize`** today).

3. **And** **auth**, **rate limiting**, and **error taxonomy** stay aligned with **upload** + **JSON summarize**: reuse **`ApiKeyGuard`**, map **`PdfExtractionError`** / **`UploadProcessingTimeoutError`** / **`SummarizationProviderError`** the same way as existing controller patterns (no new opaque **500** classes for known failures).

4. **And** **`homeinspection-api/openapi/openapi.json`** documents the route, **`multipart/form-data`** request, **`ObservationSummary`** **200**, and representative **4xx/5xx** examples—**no drift** from runtime decorators / filters.

5. **And** **[`homeinspection-api/docs/api/failure-matrix.md`](../../homeinspection-api/docs/api/failure-matrix.md)** gains rows (or sub-bullets) for the new surface: PDF required, size limit, extraction failures, summarize failures—mirroring upload + summarize wording where codes overlap.

6. **And** **`homeinspection-api/README.md`** (and optionally **`homeinspection-web/README.md`**) describe **both** flows: existing **JSON** summarize vs **multipart single-shot**, correct paths, and when to use each.

7. **And** automated tests: **unit** coverage for any new **`ReportService`** orchestration; **controller** or **e2e** coverage for happy path + at least one structured failure (mock **`AI_SUMMARIZER`** / extractor as today); **`npm run openapi:check`** passes.

## Tasks / Subtasks

- [ ] **Routing & design decision (AC: #1, #4)**  
  - [ ] **Record the chosen URL** in this story’s Dev Notes (pick one before coding): **(A)** extend **`POST /v1/report/summarize`** with a documented second `requestBody` content type (**`multipart/form-data`**) *or* **(B)** add a dedicated sub-route under **`v1/report/`** (e.g. **`POST /v1/report/summarize/file`** or similar—kebab-case, singular **`report`**). **Recommendation:** **(B)** avoids Nest/Swagger ambiguity and keeps JSON handler unchanged; if you choose **(A)**, justify and prove OpenAPI + Nest wiring stay stable.  
  - [ ] If **(B)**: register the new path in **[`app.module.ts`](../../homeinspection-api/src/app.module.ts)** **`RateLimitMiddleware`** configuration **alongside** existing **`v1/report/summarize`** (same limit semantics as JSON summarize unless product says otherwise).

- [ ] **Service orchestration (AC: #1–#3)**  
  - [ ] Add **`ReportService.summarizeFromPdfBuffer`** (name flexible) that: **`extractPreview(buffer)`** → **`summarizeObservations(dto, options)`**; propagate **`AbortSignal`** if the controller passes one (match summarize / upload patterns).  
  - [ ] Avoid duplicating PDF validation logic—**reuse** the same **`mimetype`**, magic-bytes, and size checks as **`upload`** (extract to shared helper if the controller currently inlines checks).

- [ ] **Controller + multipart (AC: #1–#3)**  
  - [ ] New handler (or extended handler per design decision) with **`FileInterceptor('file', { limits: { fileSize: … } })`** mirroring **`upload`** limits (**20 MB** unless epic/architecture says otherwise).  
  - [ ] Map errors identically to **`upload`** / **`summarizeShell`** where the failure class matches (timeout → **`UPLOAD_PROCESSING_TIMEOUT`** / **`RequestTimeoutException`** path, extraction → **`UPLOAD_PDF_PARSE_FAILED`** / **`UnprocessableEntityException`**, summarizer → **`mapSummarizationProviderError`**).

- [ ] **OpenAPI + failure matrix + README (AC: #4–#6)**  
  - [ ] Extend **[`summarization.openapi.ts`](../../homeinspection-api/src/openapi/summarization.openapi.ts)** (or sibling) and regenerate/merge **`openapi/openapi.json`**.  
  - [ ] Update **`failure-matrix.md`**.  
  - [ ] Update **`homeinspection-api/README.md`**; optionally **`homeinspection-web/README.md`** if integrators hit the web client docs for curl examples.

- [ ] **Web client pointer (AC: #6)**  
  - [ ] **Minimum:** document the new route for API users. **Stretch (optional in same PR):** add **`summarizePdfMultipart`** (or similar) in **`homeinspection-web/src/api/`** + one test—**only** if story capacity allows; otherwise split to a follow-up story.

- [ ] **Tests & gates (AC: #7)**  
  - [ ] **`npm run test`**, **`npm run lint`**, **`npm run openapi:check`** from **`homeinspection-api/`**.

## Dev Notes

### Scope boundaries (critical)

| In scope | Out of scope |
|----------|----------------|
| **API** single-shot **PDF → ObservationSummary** | Changing default **JSON** **`POST /v1/report/summarize`** contract for existing clients |
| **Reuse** extractor + summarizer ports | Persisting summaries, async jobs, billing |
| **Governance** parity (auth, rate limit, errors) | Epic **6** UI redesign (**6.1** already shipped two-step UX) |

### Contract truth

- **Success body:** **`ObservationSummary`** — unchanged.  
- **Upload field name:** **`file`** (parity with **`POST /v1/report/upload`**).  
- **JSON summarize** remains **`POST /v1/report/summarize`** with **`application/json`** — do not break.

### Current code map (read before editing)

| File | Role |
|------|------|
| [`report.controller.ts`](../../homeinspection-api/src/modules/report/report.controller.ts) | **`upload`** (multipart + **`extractPreview`**) · **`summarizeShell`** (JSON body) |
| [`report.service.ts`](../../homeinspection-api/src/modules/report/report.service.ts) | **`extractPreview`**, **`summarizeObservations`**, **`toUploadResponse`**, timeout wrapper |
| [`app.module.ts`](../../homeinspection-api/src/app.module.ts) | **`RateLimitMiddleware`** path list includes **`v1/report/summarize`** |
| [`summarization.openapi.ts`](../../homeinspection-api/src/openapi/summarization.openapi.ts) | Summarize request schema + examples for codegen/docs |
| [`http-exception.filter.ts`](../../homeinspection-api/src/common/filters/http-exception.filter.ts) | Top-level **`error.code`** mapping for summarize details |

### Architecture compliance

- **Ports:** Keep **`PDF_OBSERVATION_EXTRACTOR`** and **`AI_SUMMARIZER`** as the only seams; controller stays thin.  
- **No `any`** for parsed bodies—multipart path deals in **`Buffer`** + existing DTOs.  
- **Logging:** Do not log full PDF bytes; follow existing outcome logging patterns.

### Risks / open questions (resolve in Dev Notes during implementation)

- **Dual `requestBody` on one OpenAPI operation** can confuse some clients; if you choose route **(B)**, name the operation clearly in Swagger (`operationId`).  
- **Combined latency:** single-shot exceeds JSON-only summarize; document **NFR1** / timeout behavior (extraction + LLM) in README.

### References

- Epic source: [`epics.md`](../planning-artifacts/epics.md) — Epic **6**, Story **6.2**  
- Prior art: Story **6.1** [`6-1-web-ui-optional-ai-summary-chain-upload-json-to-summarize.md`](./6-1-web-ui-optional-ai-summary-chain-upload-json-to-summarize.md) (JSON chain)  
- OpenAPI: [`homeinspection-api/openapi/openapi.json`](../../homeinspection-api/openapi/openapi.json)  
- Project rules: [`project-context.md`](../project-context.md)

## Dev Agent Record

### Agent Model Used

_(Fill when implementing.)_

### Debug Log References

### Completion Notes List

### Implementation Plan

_(Fill during dev-story.)_

### File List

_(Fill during dev-story.)_

## Change Log

- **2026-05-11:** Story file created (`ready-for-dev`) from user request; Epic **6** reopened in sprint for **6.2**.
