# Story 5.7: API — JSON summarize payload limits, OpenAPI parity, and rate-limit policy

Status: done

## Story

As an API operator,  
I want **JSON summarize** requests to have **bounded** observation payload size and **clear** rate-limit behavior relative to **upload** and **multipart single-shot summarize**,  
So that clients cannot trivially exhaust tokens/CPU with huge bodies and so product policy on **shared vs split** rate buckets is explicit and documented.

## Acceptance Criteria

1. **Given** **`POST /v1/report/summarize`** with **`application/json`**,  
   **When** the body exceeds **documented** limits (for example max sections, max observations per section, max string lengths per observation—exact numbers chosen in Dev Notes and enforced in [`summarize-request.validation.ts`](../../homeinspection-api/src/modules/report/dto/summarize-request.validation.ts)),  
   **Then** the API rejects with a **structured 4xx** consistent with the failure matrix (not an opaque **500**), and **`openapi.json`** documents the same constraints so codegen clients are not misled.

2. **And** **`RateLimitMiddleware`** configuration either (A) applies **separate** buckets/quotas for **upload**, **JSON summarize**, and **`POST /v1/report/summarize/file`**, **or** (B) remains a **shared** bucket but **`homeinspection-api/README.md`** and **`failure-matrix.md`** explicitly state cross-endpoint interference and rationale.

3. **And** automated tests cover at least one **oversized JSON** rejection path and the chosen rate-limit policy assertion at the level feasible in unit/e2e (document gaps if only manual verification).

## Tasks / Subtasks

- [x] Add validation limits + stable error codes in DTO validation and controller mapping; update [`summarization.openapi.ts`](../../homeinspection-api/src/openapi/summarization.openapi.ts) + regenerate **`openapi/openapi.json`**; **`npm run openapi:check`** passes.
- [x] Document option **B** (shared rate bucket) in **`README.md`** and **`failure-matrix.md`**; rate-limit unit test for shared counter.
- [x] Tests per AC **#3**.

## Dev Notes

### Source

**Blind Hunter** (**2026-05-11**): missing JSON body size/count guardrails; OpenAPI/runtime drift on summarize request; shared rate-limit bucket across upload + summarize surfaces.

### Chosen limits (AC **#1**)

Enforced in **`summarize-request.validation.ts`** and mirrored in OpenAPI: **`pageCount`** max **50_000**; **`sections`** max **80**; **`observations`** per section max **2000**; **`sectionName`** max **256** chars (trimmed); observation **`text`** max **8192** chars (trimmed). Oversized bodies → **`400`** with **`details.code: SUMMARIZATION_BODY_LIMIT_EXCEEDED`**. Same **`enforceSummarizePayloadLimits`** runs after PDF extract on **`POST /v1/report/summarize/file`**.

## Change Log

- **2026-05-11:** Story created from code-review follow-ups (`ready-for-dev`).
- **2026-05-10:** Implemented limits, OpenAPI sync, README + failure matrix (shared bucket), controller/service tests, `rate-limit.middleware.spec.ts`; status **`done`**.
