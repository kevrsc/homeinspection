# Story 2.6: Automated tests with PDF fixtures

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a prototype maintainer,  
I want integration tests covering success and representative failures using fixture PDFs,  
so that regressions in parsing or validation are caught in CI (FR35, NFR8 baseline automation).

## Acceptance Criteria

1. **AC1 - Deterministic fixture-based success and failure coverage**  
   **Given** fixture PDFs checked into `test/fixtures/` (or generated deterministically),  
   **When** integration/e2e suite runs,  
   **Then** at least one test asserts successful 200 response structure and representative failure classifications.

2. **AC2 - Classification coverage for key negative paths**  
   **Given** invalid type, oversize payload, extraction failure, and timeout scenarios,  
   **When** tests execute,  
   **Then** each path asserts correct HTTP status and envelope code/details.

3. **AC3 - No external service dependency in tests**  
   **Given** CI and local execution environments,  
   **When** tests run,  
   **Then** they do not call real external/cloud services and remain deterministic.

4. **AC4 - Regression-safe quality gates**  
   **Given** fixture tests are integrated,  
   **When** running `npm run lint`, `npm run build`, `npm run test`, and `npm run test:e2e`,  
   **Then** all pass with stable and repeatable behavior.

## Tasks / Subtasks

- [x] **T1 - Introduce deterministic PDF fixtures and fixture-loading helpers** (AC: 1, 3)  
  - [x] Add fixture files under `homeinspection-api/test/fixtures/` for success and representative failure classes.  
  - [x] Add helper utilities for loading fixture bytes without hidden randomization.

- [x] **T2 - Expand e2e/integration tests to consume fixture PDFs** (AC: 1, 2, 3)  
  - [x] Add success-path assertion using realistic fixture PDF content.  
  - [x] Add/adjust negative-path tests (invalid type, oversize, parse-fail, timeout) to use fixtures where applicable.

- [x] **T3 - Preserve existing taxonomy and envelope contracts** (AC: 2, 3)  
  - [x] Ensure fixture-based tests assert current top-level/detail codes for validation, extraction failure, and extraction timeout.  
  - [x] Confirm auth/rate-limit/not-found behavior remains unaffected.

- [x] **T4 - Harden repeatability and test isolation** (AC: 3, 4)  
  - [x] Eliminate hidden timing/env coupling in new fixture tests.  
  - [x] Ensure fixtures and helper state are reset or isolated per test.

- [x] **T5 - Validate full quality gates** (AC: 4)  
  - [x] Run lint/build/test/e2e and resolve regressions.

### Review Findings

- [x] [Review][Patch] Strengthen oversized-upload assertion to validate structured envelope fields (status/code/details) instead of substring matching, to preserve AC2 contract protection [homeinspection-api/test/app.e2e-spec.ts:314]

## Dev Notes

### Epic and Story Context

- Story 2.1 added upload boundary validation and deterministic envelope behavior.
- Story 2.2 introduced extractor port + adapter seam.
- Story 2.3 added section-linked success payload.
- Story 2.4 established extraction-failure classification (`EXTRACTION_FAILED`).
- Story 2.5 added timeout guard and cancellation path with `EXTRACTION_TIMEOUT` classification.
- Story 2.6 should convert synthetic inline payloads to reusable fixture-driven coverage while preserving taxonomy.

### Architecture and Boundary Guardrails

- Keep route and response contract fixed: `POST /v1/report/upload` under `v1`.
- Preserve parser abstraction boundaries (controller/service should not become fixture-aware).
- Keep deterministic error contracts through global exception filter.
- Maintain test-only overrides without leaking into runtime behavior.

### Required File Targets (Expected)

- **Likely updated**
  - `homeinspection-api/test/app.e2e-spec.ts`
  - `homeinspection-api/test/jest-e2e.setup.ts` (if fixture setup hooks are needed)
  - `homeinspection-api/src/modules/report/report.controller.spec.ts` (if fixture-driven unit alignment is added)
  - `homeinspection-api/src/modules/report/report.service.spec.ts` (if fixture helper utilities touch service-level tests)
- **Likely new**
  - `homeinspection-api/test/fixtures/*.pdf`
  - `homeinspection-api/test/fixtures/README.md` (optional but recommended for fixture provenance and regeneration notes)
  - `homeinspection-api/test/fixtures/helpers/*.ts` (if needed for loading/normalizing fixture data)

### Previous Story Intelligence (2.5)

- Timeout path now supports cancellable extraction and strict timeout env parsing.
- Current e2e tests use deterministic text triggers; Story 2.6 should introduce fixture-based realism without breaking deterministic behavior.
- Existing classification expectations to preserve:
  - `VALIDATION_FAILED` for boundary validation failures (400)
  - `EXTRACTION_FAILED` for parse/invalid extraction shape failures (422)
  - `EXTRACTION_TIMEOUT` for timeout-triggered failures (408)

### Testing Requirements

- Maintain coverage for success + all representative negative paths.
- Ensure fixtures are deterministic and committed (no runtime generation drift unless explicitly deterministic).
- Keep tests independent and parallel-safe (env var mutation restoration, no leaked global state).

### Project Context Reference

- Follow `_bmad-output/project-context.md`:
  - no real cloud dependencies in tests
  - deterministic and repeatable test behavior
  - explicit boundary validation coverage
  - no sensitive data in fixtures

## Dev Agent Record

### Agent Model Used

Codex 5.3

### Debug Log References

- Story creation workflow context synthesis completed.
- Implemented fixture-based e2e payload loading and added deterministic oversized upload coverage.
- Ran quality gates: `npm run lint`, `npm run build`, `npm run test`, `npm run test:e2e`.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added deterministic fixture files under `test/fixtures` for success, parse-failure, shape-failure, timeout, invalid-magic, and non-PDF inputs.
- Updated `test/app.e2e-spec.ts` to load fixture bytes from disk and use them for representative upload cases.
- Added oversized upload coverage asserting 413 status with validation classification contract.
- Added payload-too-large mapping to validation taxonomy so envelope classification remains deterministic.
- Confirmed full quality gates are passing without regressions.

### File List

- `_bmad-output/implementation-artifacts/2-6-automated-tests-with-pdf-fixtures.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `homeinspection-api/src/shared/errors/error-codes.ts`
- `homeinspection-api/test/app.e2e-spec.ts`
- `homeinspection-api/test/fixtures/README.md`
- `homeinspection-api/test/fixtures/invalid-magic.pdf`
- `homeinspection-api/test/fixtures/not-a-pdf.txt`
- `homeinspection-api/test/fixtures/parse-fail.pdf`
- `homeinspection-api/test/fixtures/shape-fail.pdf`
- `homeinspection-api/test/fixtures/timeout.pdf`
- `homeinspection-api/test/fixtures/valid-upload.pdf`

---

## Change Log

- **2026-05-06:** Story created via `bmad-create-story`; status set to `ready-for-dev`.
- **2026-05-06:** Implemented fixture-driven e2e coverage for success and representative failures; added deterministic oversized upload validation classification and passed full quality gates.
