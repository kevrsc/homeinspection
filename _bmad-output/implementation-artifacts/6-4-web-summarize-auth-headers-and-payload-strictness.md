# Story 6.4: Web — summarize auth headers and payload strictness

Status: done

## Story

As a developer integrating the web client with the API,  
I want **invalid auth configuration** and **invalid summarize payloads** to **fail early** with clear behavior,  
So that we do not send misleading **`Authorization`** headers or hide bad **`pageCount`** / observation data that should surface as validation errors.

## Acceptance Criteria

1. **Given** live auth mode with an **empty or whitespace-only** API key,  
   **When** the app builds headers for upload or summarize,  
   **Then** it does **not** emit **`Authorization: Bearer `** with an empty token; instead it **throws** or returns a **documented** error path before network I/O (consistent with **`readWebConfig`** / existing fail-fast philosophy).

2. **Given** an upload success payload used to build the summarize JSON body,  
   **When** **`pageCount`** is missing, non-finite, negative, or non-integer,  
   **Then** the client does **not** silently coerce it to **`0`** for summarize if that masks data loss; it surfaces a **client-side validation error** (or blocks the summarize action with copy pointing to a bad upload state) per product choice recorded in Dev Notes.

3. **And** automated tests cover empty-key header behavior and the **`pageCount`** strictness decision.

4. **And** **`homeinspection-web/README.md`** documents summarize auth prerequisites (non-empty bearer in live mode).

## Tasks / Subtasks

- [x] Tighten [`homeinspection-web/src/api/authHeaders.ts`](../../homeinspection-web/src/api/authHeaders.ts) (or **`buildAuthHeaders`**) per AC **#1**; ensure upload and summarize share the behavior.
- [x] Adjust summarize body construction in [`homeinspection-web/src/api/summarizeReport.ts`](../../homeinspection-web/src/api/summarizeReport.ts) / related model helpers per AC **#2**; align naming with [`summarize-request.validation.ts`](../../homeinspection-api/src/modules/report/dto/summarize-request.validation.ts) server rules.
- [x] Tests in [`summarizeReport.spec.ts`](../../homeinspection-web/src/api/summarizeReport.spec.ts) and/or auth header unit tests.
- [x] README per AC **#4**.

## Dev Notes

### Source

**Blind Hunter** (**2026-05-11**): Bearer with empty key; **`pageCount`** coerced to **`0`**. **Acceptance Auditor** had no findings for Story **6.2**.

### Product choice (AC #2)

- Invalid or missing **`pageCount`**: **`buildSummarizeRequestBody`** throws **`InvalidSummarizePayloadError`**; **`summarizeObservationsPayload`** maps that (and auth header failures) to **`Error & { status: 0; body: { error: { code, message } } }`** so **`parseUploadFailure`** + **`UploadErrorPanel`** render a consistent structured error when the user clicks **Get AI summary** (no silent **`0`** coercion).

### References

- [`authHeaders.ts`](../../homeinspection-web/src/api/authHeaders.ts)  
- [`summarizeReport.ts`](../../homeinspection-web/src/api/summarizeReport.ts)

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

### Completion Notes List

- **`buildAuthHeaders`**: live mode trims **`apiKey`**; throws before emitting **`Authorization: Bearer`** when empty or whitespace-only (upload and summarize share this via **`uploadReportPdf`** / **`summarizeObservationsPayload`**).
- **`buildSummarizeRequestBody`**: requires **`pageCount`** as a non-negative integer (parity with API **`parseAndValidateSummarizeBody`**); exports **`InvalidSummarizePayloadError`**.
- **`summarizeObservationsPayload`**: wraps auth/payload failures as **`CLIENT_AUTH_CONFIG`** / **`CLIENT_SUMMARIZE_PAYLOAD_INVALID`** with **`status: 0`** for the results error panel.
- New **`authHeaders.spec.ts`**; expanded **`summarizeReport.spec.ts`** (including **`fetch`** not called on client validation failures).
- **`npm run test`**, **`npm run lint`**, **`npm run build`** passed from **`homeinspection-web/`**.

### Implementation Plan

- Defense in depth alongside **`readWebConfig()`** (which already rejects live without **`VITE_API_KEY`** at startup).

## File List

- `homeinspection-web/src/api/authHeaders.ts`
- `homeinspection-web/src/api/authHeaders.spec.ts`
- `homeinspection-web/src/api/summarizeReport.ts`
- `homeinspection-web/src/api/summarizeReport.spec.ts`
- `homeinspection-web/README.md`

## Change Log

- **2026-05-11:** Story created from code-review follow-ups (`ready-for-dev`).
- **2026-05-10:** Implemented auth + **`pageCount`** strictness; status **`review`**; sprint **`6-4`** → **`review`**.
