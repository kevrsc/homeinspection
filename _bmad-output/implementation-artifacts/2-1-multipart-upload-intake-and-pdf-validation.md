# Story 2.1: Multipart upload intake and PDF validation

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an API consumer,  
I want to upload a PDF file with standard multipart encoding and have the service reject bad inputs before extraction,  
so that users get immediate feedback and the system avoids wasted processing (FR2-FR5, NFR2, NFR5).

## Acceptance Criteria

1. **AC1 - Multipart upload boundary exists on v1 route**  
   **Given** a client sends multipart form-data to `POST /v1/report/upload`,  
   **When** the request reaches the report controller,  
   **Then** the route accepts the multipart payload shape and validates file presence.

2. **AC2 - Non-PDF payloads fail with deterministic validation response**  
   **Given** an upload with non-PDF content type or non-PDF magic bytes,  
   **When** the request is processed,  
   **Then** the API returns 4xx validation failure with stable error envelope and explicit validation classification.

3. **AC3 - Validation short-circuits before extraction behavior**  
   **Given** invalid upload input,  
   **When** the endpoint is called,  
   **Then** extraction path is not invoked and request fails fast at boundary.

4. **AC4 - Quality gates**  
   **Given** implementation is complete,  
   **When** running `npm run lint`, `npm run build`, and targeted e2e verification,  
   **Then** all pass with no regressions to existing API governance behavior.

## Tasks / Subtasks

- [x] **T1 - Add multipart upload intake on upload route** (AC: 1)  
  - [x] Add interceptor-based multipart file intake for the `file` form field.  
  - [x] Preserve existing auth guard and route versioning behavior.

- [x] **T2 - Implement PDF boundary validation** (AC: 2, 3)  
  - [x] Fail with deterministic validation response when file is missing.  
  - [x] Fail with deterministic validation response when content type is not PDF.  
  - [x] Fail with deterministic validation response when magic bytes are not PDF.

- [x] **T3 - Add e2e coverage for invalid upload inputs** (AC: 1, 2, 3, 4)  
  - [x] Add multipart shell test with PDF-like payload to prove route intake behavior.  
  - [x] Add missing-file validation e2e test.  
  - [x] Add non-PDF content-type and magic-bytes validation e2e tests.

- [x] **T4 - Run quality gates** (AC: 4)  
  - [x] Run lint/build/e2e and resolve issues.

## Dev Notes

### Context

- Epic 1 already established route shell, auth guard, request-id propagation, error envelope, and rate limiting.
- Story 2.1 introduces only intake and boundary validation; extraction implementation remains for later Epic 2 stories.

### Guardrails

- Keep contract route stable at `POST /v1/report/upload`.
- Keep deterministic envelope via existing global exception filter.
- Do not introduce extraction library coupling in controller.

## Dev Agent Record

### Agent Model Used

Codex 5.3

### Debug Log References

- `npm run lint`
- `npm run build`
- `npm run test:e2e -- --runInBand test/app.e2e-spec.ts`

### Completion Notes List

- Added multipart intake to upload route using `FileInterceptor('file')` with a 20 MB boundary.
- Added boundary validation for missing file and non-PDF uploads (content type + magic bytes).
- Preserved existing shell-only behavior for valid PDF uploads to avoid prematurely introducing extraction logic.
- Added e2e coverage for missing file, non-PDF content type, and invalid PDF magic bytes.
- Verified lint/build/e2e checks pass after implementation.

### File List

- `_bmad-output/implementation-artifacts/2-1-multipart-upload-intake-and-pdf-validation.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `homeinspection-api/src/modules/report/report.controller.ts`
- `homeinspection-api/test/app.e2e-spec.ts`

---

## Change Log

- **2026-05-06:** Story created and implemented for multipart upload intake and PDF validation; status set to `review`.
