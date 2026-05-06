# Story 2.5: Processing timeout guard for upload pipeline

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a prototype maintainer,  
I want the upload-to-response path bounded by the SLO,  
so that clients never hang indefinitely (FR33 partial, NFR1, NFR11).

## Acceptance Criteria

1. **AC1 - Timeout bound enforced for extraction path**  
   **Given** extraction exceeds the configured processing budget (<=30s target from epic guidance),  
   **When** timeout threshold is crossed,  
   **Then** API returns deterministic timeout error envelope with request correlation context.

2. **AC2 - Validation short-circuit preserved**  
   **Given** upload fails boundary validation (missing file, non-PDF, invalid magic bytes, auth/rate limit),  
   **When** request is rejected,  
   **Then** timeout guard does not interfere and existing failure taxonomy remains unchanged.

3. **AC3 - Distinct timeout classification**  
   **Given** timeout-triggered extraction cancellation/abort,  
   **When** envelope is produced,  
   **Then** top-level and detail codes are deterministic and distinct from parse failures (`UPLOAD_PDF_PARSE_FAILED`) and boundary validation failures.

4. **AC4 - Regression-safe quality gates**  
   **Given** implementation is complete,  
   **When** running `npm run lint`, `npm run build`, `npm run test`, and `npm run test:e2e`,  
   **Then** all pass with deterministic timeout behavior coverage.

## Tasks / Subtasks

- [x] **T1 - Define timeout taxonomy and configuration contract** (AC: 1, 3)  
  - [x] Introduce timeout-specific detail/top-level code mapping and keep it separate from parse/validation categories.  
  - [x] Define configurable timeout budget source (env-driven, no hardcoded production values).

- [x] **T2 - Implement timeout guard in upload extraction flow** (AC: 1, 2, 3)  
  - [x] Wrap extraction execution with a deterministic timeout boundary in service/controller orchestration.  
  - [x] Ensure timeout behavior only applies once request passes validation boundaries.

- [x] **T3 - Add unit coverage for timeout and non-timeout extraction paths** (AC: 1, 2, 3, 4)  
  - [x] Add tests for timeout-triggered classification and payload details.  
  - [x] Add tests to ensure parse failure and unexpected internal errors still map correctly.

- [x] **T4 - Add e2e assertions for timeout classification and regressions** (AC: 1, 2, 3, 4)  
  - [x] Add deterministic e2e timeout scenario using controllable test double behavior.  
  - [x] Re-assert existing validation/parse/success paths unaffected.

- [x] **T5 - Validate full quality gates** (AC: 4)  
  - [x] Run lint/build/test/e2e and resolve all regressions.

### Review Findings

- [x] [Review][Patch] Add cancellable extractor timeout handling to abort in-flight extraction work [homeinspection-api/src/modules/report/report.service.ts]
- [x] [Review][Patch] Enforce strict timeout env parsing and reject malformed values like `20ms` [homeinspection-api/src/modules/report/report.service.ts]
- [x] [Review][Patch] Isolate environment variable restoration per test case for timeout tests [homeinspection-api/src/modules/report/report.service.spec.ts]

## Dev Notes

### Epic and Story Context

- Story 2.1 introduced boundary validation and deterministic validation envelopes.
- Story 2.2 introduced extraction seam and parse error classification.
- Story 2.3 introduced successful response payload and extraction result hardening.
- Story 2.4 established deterministic extraction failure classification (`EXTRACTION_FAILED`) with safe optional partial context.
- Story 2.5 now adds latency/SLO guardrails; must avoid breaking established taxonomy.

### Architecture and Boundary Guardrails

- Keep route fixed at `POST /v1/report/upload` under `v1`.
- Maintain controller thinness and service-level orchestration responsibilities.
- Keep parser-specific concerns behind extractor port; timeout orchestration should avoid tight parser coupling.
- Preserve request-id envelope behavior via global exception filter.

### Required File Targets (Expected)

- **Likely updated**
  - `homeinspection-api/src/modules/report/report.controller.ts`
  - `homeinspection-api/src/modules/report/report.controller.spec.ts`
  - `homeinspection-api/src/modules/report/report.service.ts`
  - `homeinspection-api/src/modules/report/report.service.spec.ts`
  - `homeinspection-api/src/shared/errors/error-codes.ts`
  - `homeinspection-api/src/common/filters/http-exception.filter.ts`
  - `homeinspection-api/test/app.e2e-spec.ts`
- **Possibly updated**
  - `homeinspection-api/src/common/config/*` or equivalent env config files if timeout budget is centralized

### Previous Story Intelligence (2.4)

- Extraction failures are currently mapped to HTTP 422 with top-level `EXTRACTION_FAILED` when `details.code` is `UPLOAD_PDF_PARSE_FAILED`.
- Safe partial context currently allows only positive integer `partial.pageCount`.
- Any new timeout details should follow same deterministic and non-sensitive pattern.

### Testing Requirements

- Preserve all existing e2e classifications:
  - validation failures remain `VALIDATION_FAILED` (400)
  - extraction parse failures remain `EXTRACTION_FAILED` (422) with `UPLOAD_PDF_PARSE_FAILED`
  - success remains 200 section-linked payload
  - auth/rate-limit behavior unchanged
- Add deterministic timeout tests at unit + e2e levels with controllable delayed extractor behavior.

### Project Context Reference

- Follow `_bmad-output/project-context.md`:
  - env-driven configuration only
  - explicit timeout bounds (no unbounded waits)
  - deterministic actionable errors
  - no sensitive internals in response payloads

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
- Added env-driven extraction timeout guard in `ReportService` with deterministic timeout error emission (`UploadProcessingTimeoutError`).
- Added timeout-specific controller mapping to HTTP 408 with details code `UPLOAD_PROCESSING_TIMEOUT`, `retryable: true`, and timeout budget context.
- Added top-level error-code mapping to `EXTRACTION_TIMEOUT` in the global exception filter when timeout detail code is present.
- Preserved existing validation, parse-failure, auth, and rate-limit classification behavior.
- Added unit and e2e timeout-path tests using deterministic unresolved extractor test doubles.
- Verified full quality gates pass: lint, build, unit tests, and e2e tests.

### File List

- `_bmad-output/implementation-artifacts/2-5-processing-timeout-guard-for-upload-pipeline.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `homeinspection-api/src/modules/report/report.service.ts`
- `homeinspection-api/src/modules/report/report.service.spec.ts`
- `homeinspection-api/src/modules/report/report.controller.ts`
- `homeinspection-api/src/modules/report/report.controller.spec.ts`
- `homeinspection-api/src/common/filters/http-exception.filter.ts`
- `homeinspection-api/src/shared/errors/error-codes.ts`
- `homeinspection-api/test/app.e2e-spec.ts`

---

## Change Log

- **2026-05-06:** Story created via `bmad-create-story`; status set to `ready-for-dev`.
- **2026-05-06:** Implemented timeout guard and deterministic timeout classification with full test coverage; status set to `review`.
- **2026-05-06:** Addressed code review findings (3 patch items resolved) and re-ran full quality gates; status set to `done`.
