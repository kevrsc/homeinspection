# Story 2.4: Extraction failure handling with deterministic errors

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an API consumer,  
I want extraction failures to return predictable error codes and messages,  
so that my app can branch retry vs user correction flows (FR11, FR12, FR14-FR16, NFR9, NFR11).

## Acceptance Criteria

1. **AC1 - Deterministic extraction failure classification**  
   **Given** extractor failure or unrecoverable parse state,  
   **When** upload processing maps the error to HTTP,  
   **Then** client receives structured error schema with a classification distinct from upload validation failures.

2. **AC2 - Optional safe partial context**  
   **Given** extraction fails after some progress,  
   **When** response is produced,  
   **Then** only safe and useful partial context fields may be included with no sensitive internals leaked.

3. **AC3 - Existing boundary failures remain unchanged**  
   **Given** missing file, wrong MIME type, invalid magic bytes, auth failure, or rate limiting,  
   **When** request fails,  
   **Then** existing envelope/codes remain stable and unchanged from prior stories.

4. **AC4 - Regression-safe quality gates**  
   **Given** implementation is complete,  
   **When** running `npm run lint`, `npm run build`, `npm run test`, and `npm run test:e2e`,  
   **Then** all pass with deterministic behavior.

## Tasks / Subtasks

- [x] **T1 - Define failure taxonomy mapping for extraction phase** (AC: 1, 3)  
  - [x] Identify extraction failure classes and map them to deterministic `details.code` values.  
  - [x] Ensure extraction failures remain distinct from boundary validation and internal server failures.

- [x] **T2 - Implement deterministic error mapping in report flow** (AC: 1, 2, 3)  
  - [x] Update report orchestration/controller path to map extraction errors consistently.  
  - [x] Keep safe optional context minimal and non-sensitive.

- [x] **T3 - Expand unit coverage for failure branches** (AC: 1, 2, 3, 4)  
  - [x] Add/adjust service/controller unit tests for each extraction failure class and fallback behavior.  
  - [x] Validate unchanged behavior for non-extraction failures.

- [x] **T4 - Expand e2e coverage for deterministic error envelopes** (AC: 1, 3, 4)  
  - [x] Add e2e assertions for extraction-failure envelope code/message stability.  
  - [x] Preserve and re-assert existing boundary failure expectations.

- [x] **T5 - Validate full quality gates** (AC: 4)  
  - [x] Run lint/build/test/e2e and resolve all regressions.

## Dev Notes

### Epic and Story Context

- Story 2.1 established upload boundary validation taxonomy.
- Story 2.2 introduced extractor seam and base parse-failure mapping.
- Story 2.3 introduced 200 success payload and hardened extraction-shape guards.
- Story 2.4 must deepen failure taxonomy consistency without destabilizing prior envelopes.

### Architecture and Boundary Guardrails

- Keep route fixed: `POST /v1/report/upload` under `v1`.
- Preserve controller thinness and port/adapters separation.
- Maintain deterministic envelope conventions from global exception filter.
- Avoid leaking parser internals, stack traces, raw payload data, or sensitive metadata.

### Required File Targets (Expected)

- **Likely updated**
  - `homeinspection-api/src/modules/report/report.controller.ts`
  - `homeinspection-api/src/modules/report/report.controller.spec.ts`
  - `homeinspection-api/src/modules/report/report.service.ts`
  - `homeinspection-api/src/modules/report/report.service.spec.ts`
  - `homeinspection-api/test/app.e2e-spec.ts`
- **Possibly updated**
  - `homeinspection-api/src/shared/errors/error-codes.ts` (if taxonomy normalization is centralized)
  - `_bmad-output/implementation-artifacts/deferred-work.md` (if new deferred findings emerge)

### Previous Story Intelligence (2.3)

- First-seen section ordering is now an explicit contract.
- Extraction result shape is now runtime-validated in service and throws `PdfExtractionError` for invalid payload shape.
- Parse-failure e2e trigger was made deterministic for test stability.
- Story 2.3 is done and should be treated as current baseline behavior.

### Testing Requirements

- Preserve all existing e2e expectations (auth, rate-limit, validation, parse failure, success).
- Add deterministic assertions for extraction failure categories and envelope details.
- Ensure regression coverage verifies unchanged boundary failures.

### Project Context Reference

- Follow `_bmad-output/project-context.md`:
  - explicit typing at boundaries
  - deterministic and actionable errors
  - no sensitive leakage
  - no cloud dependencies in tests

## Dev Agent Record

### Agent Model Used

Codex 5.3

### Debug Log References

- Story creation workflow context synthesis completed.
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run test:e2e`

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added deterministic extraction-failure taxonomy by mapping HTTP 422 to top-level `EXTRACTION_FAILED`.
- Updated report controller to map `PdfExtractionError` to 422 with deterministic details (`UPLOAD_PDF_PARSE_FAILED`, `retryable: false`).
- Added optional safe partial context support (`details.partial.pageCount`) when extraction error cause provides finite `pageCount`.
- Preserved existing boundary failure mappings for missing file, non-PDF upload, auth, and rate limiting.
- Added controller/e2e coverage for extraction failure branches, including malformed extraction shape responses.
- Verified full quality gates pass: lint, build, unit tests, and e2e tests.

### File List

- `_bmad-output/implementation-artifacts/2-4-extraction-failure-handling-with-deterministic-errors.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `homeinspection-api/src/shared/errors/error-codes.ts`
- `homeinspection-api/src/modules/report/report.controller.ts`
- `homeinspection-api/src/modules/report/report.controller.spec.ts`
- `homeinspection-api/test/app.e2e-spec.ts`

---

## Change Log

- **2026-05-06:** Story created via `bmad-create-story`; status set to `ready-for-dev`.
- **2026-05-06:** Implemented deterministic extraction failure taxonomy and tests; status set to `review`.
