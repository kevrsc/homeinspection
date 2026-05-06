# Story 2.9: Developer-facing failure matrix and fixture JSON

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an API consumer,  
I want a narrative failure matrix and copy-pasteable JSON fixtures,  
so that I can teach my client app how to handle each case (UX-DR2, UX-DR3, FR16).

## Acceptance Criteria

1. **AC1 - Failure matrix covers all required classes with runtime-aligned payloads**  
   **Given** the current upload runtime contract and deterministic error taxonomy,  
   **When** a developer reads the committed failure-matrix documentation,  
   **Then** it includes at least validation type, validation size, auth failure, rate limit, extraction failure, and timeout classes, with runtime-aligned HTTP status and JSON envelope examples.

2. **AC2 - JSON fixtures exist for success and required error classes**  
   **Given** API consumers need copy-paste test payloads,  
   **When** fixtures are published in the documented location,  
   **Then** there is one success fixture and one fixture per required error class, and each fixture matches the same envelope/field names as runtime behavior (including `requestId` placeholder on failures).

3. **AC3 - Documentation and fixtures are cross-linked and reproducible**  
   **Given** docs can drift from runtime if maintained ad hoc,  
   **When** this story is implemented,  
   **Then** the failure matrix references fixture file paths directly and fixture values remain deterministic and CI-safe (ASCII JSON, stable placeholders).

4. **AC4 - Regression-safe validation gates remain green**  
   **Given** this story is documentation-and-fixture focused,  
   **When** quality gates run (`npm run lint`, `npm run build`, `npm run test`, `npm run test:e2e`),  
   **Then** all pass with no behavior regressions in upload endpoint runtime semantics.

## Tasks / Subtasks

- [x] **T1 - Author developer-facing failure matrix doc** (AC: 1, 3)  
  - [x] Create a docs page describing each required failure class with: purpose, trigger condition, expected status, top-level code, and actionable client handling guidance.  
  - [x] Include a success row/section so integrators see both expected success and failure handling patterns from one location.  
  - [x] Link every matrix entry to its corresponding fixture JSON file path.

- [x] **T2 - Add deterministic JSON fixture set for success and required failures** (AC: 2, 3)  
  - [x] Add fixture files under a documented, repo-local path (recommended: `homeinspection-api/test/fixtures/json/`).  
  - [x] Include fixtures for: success, validation type failure, validation size failure (`413`), auth failure (`401`), rate limit (`429`), extraction failure (`422`), timeout (`408`).  
  - [x] Use deterministic placeholder values (`requestId`, messages when runtime may vary) while preserving runtime field names and envelope shape.

- [x] **T3 - Add guardrail validation for fixture/doc alignment** (AC: 1, 2, 3)  
  - [x] Add focused tests (or deterministic checks) that assert fixture JSON is parseable and preserves required keys for each class.  
  - [x] Ensure at least one automated check verifies documented fixture paths exist and are in sync with the failure matrix references.

- [x] **T4 - Run full quality gates and confirm no runtime regressions** (AC: 4)  
  - [x] Run `npm run lint`, `npm run build`, `npm run test`, and `npm run test:e2e`.  
  - [x] Confirm upload route runtime contract behavior (status/classification/envelope) remains unchanged.

### Review Findings

- [x] [Review][Patch] Add explicit inline JSON envelope examples to failure matrix docs (not only fixture links) to satisfy AC1 contract clarity [homeinspection-api/docs/api/failure-matrix.md]
- [x] [Review][Patch] Add dedicated missing-file validation fixture (`UPLOAD_FILE_REQUIRED`) and update matrix row mapping (current row points to wrong-type fixture) [homeinspection-api/docs/api/failure-matrix.md]
- [x] [Review][Patch] Strengthen matrix-alignment test to assert reverse/strict mapping (detect extra or stale doc fixture references, not just expected-name presence) [homeinspection-api/test/app.e2e-spec.ts]
- [x] [Review][Patch] Harden fixture-contract guardrail assertions with per-fixture required nested fields/types to catch structural drift [homeinspection-api/test/app.e2e-spec.ts]
- [x] [Review][Defer] Existing oversized-upload assertion in e2e remains regex-based and does not fully assert structured envelope details [homeinspection-api/test/app.e2e-spec.ts] — deferred, pre-existing

## Dev Notes

### Epic and Story Context

- Story 2.9 follows Story 2.8 OpenAPI alignment and should use current runtime behavior as source of truth, not invent new error semantics.
- Epic intent is integrator usability without SDK; this story is a documentation + fixtures bridge that reduces client implementation ambiguity.

### Current Runtime Baseline (Must Read Before Coding)

- Upload endpoint and failure mapping:
  - `homeinspection-api/src/modules/report/report.controller.ts`
  - `homeinspection-api/src/common/filters/http-exception.filter.ts`
  - `homeinspection-api/src/shared/errors/error-codes.ts`
- Runtime-aligned OpenAPI contract/examples:
  - `homeinspection-api/src/openapi/upload.openapi.ts`
  - `homeinspection-api/openapi/openapi.json`
- Existing e2e behavioral assertions for the required classes:
  - `homeinspection-api/test/app.e2e-spec.ts`

### Architecture and Boundary Guardrails

- Keep API behavior unchanged; this story documents and fixtures existing behavior only.  
- Preserve deterministic, stable error envelope:
  - `error.code`
  - `error.message`
  - `error.requestId`
  - optional `error.details`
- Do not add cloud dependencies or external services for fixture generation or docs validation.
- Keep fixtures ASCII JSON and deterministic for CI stability.

### Technical Requirements for This Story

- Matrix must cover at least:
  - Validation type failure (`400` / `VALIDATION_FAILED`)
  - Validation size failure (`413` / `VALIDATION_FAILED`)
  - Auth failure (`401` / `UNAUTHORIZED`)
  - Rate limit (`429` / `RATE_LIMITED`)
  - Extraction failure (`422` / `EXTRACTION_FAILED`)
  - Timeout (`408` / `EXTRACTION_TIMEOUT`)
  - Success (`200`)
- Fixture content must align with current runtime and OpenAPI field names.
- For messages/details that may evolve, document placeholder policy explicitly while keeping envelope keys exact.

### Required File Targets (Expected)

- **Likely new**
  - `homeinspection-api/docs/api/failure-matrix.md` (or equivalent docs path under `homeinspection-api/docs/`)
  - `homeinspection-api/test/fixtures/json/upload-success.json`
  - `homeinspection-api/test/fixtures/json/upload-error-validation-missing-file.json`
  - `homeinspection-api/test/fixtures/json/upload-error-validation-type.json`
  - `homeinspection-api/test/fixtures/json/upload-error-validation-size.json`
  - `homeinspection-api/test/fixtures/json/upload-error-auth.json`
  - `homeinspection-api/test/fixtures/json/upload-error-rate-limit.json`
  - `homeinspection-api/test/fixtures/json/upload-error-extraction.json`
  - `homeinspection-api/test/fixtures/json/upload-error-timeout.json`
- **Likely updated**
  - `homeinspection-api/test/app.e2e-spec.ts` (if fixture/doc alignment checks are added here)
  - `homeinspection-api/README.md` (if adding discoverability links to failure matrix/fixtures)

### Previous Story Intelligence (2.8)

- Story 2.8 established OpenAPI as runtime-aligned contract source and added deterministic `openapi:generate`/`openapi:check`.
- Review patches in 2.8 hardened drift detection and added explicit `413` and auth OpenAPI security metadata; 2.9 docs/fixtures must include both.
- Current guarded contract checks in e2e already verify response classes; prefer reusing those semantics rather than redefining expectations in docs.

### Git Intelligence Summary

- Recent Epic 2 commits consistently tighten contract determinism and test coverage:
  - `267772f` Story 2.8 OpenAPI alignment and drift-hardening
  - `c40c2fd` Story 2.7 structured outcome logging
  - `5e59d5c` Story 2.6 fixture-driven e2e coverage
  - `638884c` Story 2.5 timeout guard
  - `4419d51` Story 2.4 deterministic extraction-failure classification
- Keep same pattern for 2.9: document from runtime truth + enforce deterministic guardrails.

### Latest Technical Information

- Current NestJS Swagger guidance emphasizes explicit response codes, request/response examples, and auth metadata in OpenAPI; 2.9 fixtures/docs should directly mirror the generated spec/runtime rather than hand-wavy prose.
- Maintain spec-quality examples suitable for client generation and onboarding; ensure every documented class maps to a concrete fixture artifact.

### Testing Requirements

- Add checks that:
  - parse each fixture JSON file
  - verify envelope shape keys exist for each fixture class
  - verify failure matrix references resolve to existing fixture paths
- Preserve all existing runtime behavior tests; this story should not weaken current e2e assertions.

### Project Context Reference

- Follow `_bmad-output/project-context.md` priorities:
  - explicit typed boundaries and deterministic contracts
  - no cloud calls in tests
  - no silent contract drift
  - actionable, non-leaky error handling

## Dev Agent Record

### Agent Model Used

Codex 5.3

### Debug Log References

- Auto-discovered first backlog story in sprint status: `2-9-developer-facing-failure-matrix-and-fixture-json`.
- Loaded complete epics, architecture, PRD, UX, project-context, and previous story (`2-8`) for continuity.
- Extracted current runtime source-of-truth files and recent commit history for deterministic pattern guidance.
- Authored runtime-aligned failure matrix and linked each row to fixture JSON artifact paths.
- Added deterministic JSON fixtures for success, validation type/size, auth, rate-limit, extraction, and timeout classes.
- Added e2e guardrails to parse fixture JSON envelopes and verify matrix references remain in sync.
- Executed quality gates: `npm run lint`, `npm run build`, `npm run test`, and `npm run test:e2e`.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Published a developer-facing failure matrix for upload outcomes with trigger/status/code guidance and fixture links.
- Added copy-paste JSON fixtures under `test/fixtures/json/` for success and every required failure class.
- Added deterministic automated checks for fixture parseability/envelope shape and matrix-to-fixture path alignment.
- Confirmed no runtime regressions by running full lint/build/test/e2e gates.
- Post-review: Inline JSON examples added to the failure matrix; dedicated missing-file fixture (`UPLOAD_FILE_REQUIRED`); matrix doc fixture path set equals expected fixtures (bidirectional); per-fixture structural assertions in e2e guardrails.

### File List

- `_bmad-output/implementation-artifacts/2-9-developer-facing-failure-matrix-and-fixture-json.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `homeinspection-api/README.md`
- `homeinspection-api/docs/api/failure-matrix.md`
- `homeinspection-api/test/app.e2e-spec.ts`
- `homeinspection-api/test/fixtures/README.md`
- `homeinspection-api/test/fixtures/json/upload-error-auth.json`
- `homeinspection-api/test/fixtures/json/upload-error-extraction.json`
- `homeinspection-api/test/fixtures/json/upload-error-rate-limit.json`
- `homeinspection-api/test/fixtures/json/upload-error-timeout.json`
- `homeinspection-api/test/fixtures/json/upload-error-validation-missing-file.json`
- `homeinspection-api/test/fixtures/json/upload-error-validation-size.json`
- `homeinspection-api/test/fixtures/json/upload-error-validation-type.json`
- `homeinspection-api/test/fixtures/json/upload-success.json`

---

## Change Log

- **2026-05-06:** Story created via `bmad-create-story`; status set to `ready-for-dev`.
- **2026-05-06:** Implemented failure matrix docs, deterministic JSON fixtures, and guardrail checks; status set to `review`.
- **2026-05-06:** Applied code-review patches (inline matrix examples, missing-file fixture, strict matrix/fixture set equality in e2e, per-fixture shape assertions); status set to `done`; gates re-run green.
