# Story 2.3: Section-linked observation response model

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a homeowner (via a client),  
I want observations returned grouped by report section in stable JSON,  
so that I can scan priorities quickly (FR8, FR9, FR13, FR30-FR32, NFR13).

## Acceptance Criteria

1. **AC1 - Section-grouped success contract for v1 upload**  
   **Given** extraction succeeds for a valid PDF upload,  
   **When** `POST /v1/report/upload` returns HTTP 200,  
   **Then** the payload includes section-grouped observation entries using stable field names suitable for direct client rendering.

2. **AC2 - Contract aligns with OpenAPI intent and existing error envelope behavior**  
   **Given** the v1 runtime contract,  
   **When** success and failure responses are evaluated together,  
   **Then** success body follows the Story 2.3 schema intent and failure paths continue using deterministic error envelope semantics from Epic 1/Story 2.1/2.2.

3. **AC3 - Consistent camelCase field naming**  
   **Given** JSON response fields in success payload,  
   **When** consumers parse response objects,  
   **Then** all property names are `camelCase` and consistent with architecture guidance.

4. **AC4 - Regression-safe quality gates**  
   **Given** implementation is complete,  
   **When** running `npm run lint`, `npm run build`, `npm run test`, and `npm run test:e2e`,  
   **Then** all pass with no regressions in auth, rate-limit, request-id, and validation/extraction failure classification behavior.

## Tasks / Subtasks

- [x] **T1 - Define typed success response DTO/model for section-linked observations** (AC: 1, 3)  
  - [x] Add or update DTO/types under `homeinspection-api/src/modules/report/dto/` for stable section-linked output.  
  - [x] Ensure schema reflects section grouping with observation arrays and uses only `camelCase`.

- [x] **T2 - Map extraction result into section-linked response in service layer** (AC: 1, 2, 3)  
  - [x] Update `ReportService` to convert extractor output into normalized section-grouped success payload.  
  - [x] Keep controller orchestration thin (validation + delegation + response return).

- [x] **T3 - Return HTTP 200 success path for valid extraction** (AC: 1, 2)  
  - [x] Replace shell-only success-blocking flow with actual success response when extraction returns usable data.  
  - [x] Preserve deterministic error behavior for validation and extraction failures.

- [x] **T4 - Add tests for success response shape and contract stability** (AC: 1, 2, 3, 4)  
  - [x] Add/adjust unit tests for response mapping logic in service layer.  
  - [x] Add e2e success-path test asserting 200 with section-linked structure and `camelCase` fields.  
  - [x] Retain coverage for existing failure envelope paths.

- [x] **T5 - Validate full quality gates** (AC: 4)  
  - [x] Run lint/build/test/e2e and resolve all regressions.

### Review Findings

- [x] [Review][Patch] Document and test first-seen section ordering as the stability contract [homeinspection-api/src/modules/report/report.service.ts:40]
- [x] [Review][Patch] Add explicit test coverage for empty-observation mapping edge case [homeinspection-api/src/modules/report/report.service.spec.ts:42]
- [x] [Review][Patch] Normalize whitespace-only section names before fallback to `general` [homeinspection-api/src/modules/report/report.service.ts:27]
- [x] [Review][Patch] Make e2e parse-failure trigger deterministic without content-fragment coupling [homeinspection-api/test/app.e2e-spec.ts:25]
- [x] [Review][Patch] Guard malformed extractor payloads and preserve parse-failure taxonomy for invalid extraction shapes [homeinspection-api/src/modules/report/report.service.ts:20]

## Dev Notes

### Epic and Story Context

- Story 2.1 established multipart upload + boundary validation and deterministic validation failures.
- Story 2.2 introduced extractor port/adapter seam and extraction error classification (`UPLOAD_PDF_PARSE_FAILED` path).
- Story 2.3 is the first story expected to return successful extraction data shape instead of shell-only behavior.

### Architecture and Boundary Guardrails

- Keep route contract fixed at `POST /v1/report/upload` under `v1`.
- Keep controller thin; mapping/transformation belongs in service/application layer.
- Preserve ports/adapters: controller and service depend on port abstraction, not parser internals.
- Success schema must be stable and explicitly typed; avoid ad-hoc object literals spread through controller code.

### Response Shape Direction (Implementation Target)

- Use section-first grouping model with deterministic top-level envelope for success.
- Example structural direction (final field names must remain `camelCase`):
  - `sections: Array<{ sectionName: string; observations: Array<{ text: string; ...optional metadata }> }>`
- Keep names concise, predictable, and aligned with future OpenAPI alignment story (`2-8`).

### Required File Targets (Expected)

- **Likely new/updated**
  - `homeinspection-api/src/modules/report/dto/extraction-response.dto.ts` (or equivalent typed contract file)
  - `homeinspection-api/src/modules/report/report.service.ts`
  - `homeinspection-api/src/modules/report/report.service.spec.ts`
  - `homeinspection-api/src/modules/report/report.controller.ts`
  - `homeinspection-api/test/app.e2e-spec.ts`
- **Possibly updated**
  - `homeinspection-api/src/modules/report/extractors/pdf-observation-extractor.port.ts` (if mapping metadata needs minor expansion)
  - `homeinspection-api/src/modules/report/extractors/pdf-observation-extractor.adapter.spec.ts`

### Previous Story Intelligence (2.2)

- 2.2 added port/adapter/service seam and ensured extraction failure classification is distinct from validation failures.
- 2.2 fixed abstraction leak by using `PdfExtractionError` from port contract in controller logic.
- 2.2 introduced Node engine constraint alignment with `pdf-parse`; preserve current engines compatibility guard.
- Existing tests now include controller-level parse-failure and unexpected-exception behavior checks.

### Git Intelligence (Recent Pattern)

- `feat(api): add extractor port and PDF adapter seam (Story 2.2)`
- `chore(bmad): mark Story 2.1 as done`
- `feat(api): add multipart upload intake and PDF validation (Story 2.1)`
- Commit style remains story-scoped with explicit Story reference and full quality-gate evidence.

### Latest Technical Notes

- `pdf-parse` in current repo is `2.4.5`; parser returns text/page metadata via `PDFParse` API.
- Preserve deterministic parse-error mapping (`PdfExtractionError`) while adding success-output mapping.
- Keep extraction output normalization deterministic for equivalent parser outputs.

### Testing Requirements

- Keep all prior e2e failures stable:
  - missing file
  - non-PDF/magic-byte invalid
  - auth failure
  - rate-limit path
  - parse-failed classification
- Add explicit success-path e2e asserting schema shape and HTTP 200.
- Add unit tests for mapping behavior including section grouping logic and empty-observation edge handling.

### Project Context Reference

- Follow `_bmad-output/project-context.md`:
  - explicit boundary typing
  - deterministic error/success contracts
  - no secrets in logs/payloads
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
- Added typed success DTOs for Story 2.3 response contract with `pageCount` and section-linked `sections` payload.
- Updated `ReportService` mapping to transform extractor observations into deterministic section-grouped response data.
- Updated report upload controller to return successful extraction responses with explicit `HTTP 200` while preserving validation and extraction error taxonomy.
- Expanded unit coverage for service mapping behavior and controller success path.
- Added e2e coverage for successful upload response using provider override to keep test behavior deterministic.
- Verified all quality gates pass: lint, build, unit tests, and e2e tests.

### File List

- `_bmad-output/implementation-artifacts/2-3-section-linked-observation-response-model.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `homeinspection-api/src/modules/report/dto/extraction-response.dto.ts`
- `homeinspection-api/src/modules/report/report.service.ts`
- `homeinspection-api/src/modules/report/report.controller.ts`
- `homeinspection-api/src/modules/report/report.service.spec.ts`
- `homeinspection-api/src/modules/report/report.controller.spec.ts`
- `homeinspection-api/test/app.e2e-spec.ts`

---

## Change Log

- **2026-05-06:** Story created via `bmad-create-story`; status set to `ready-for-dev`.
- **2026-05-06:** Implemented Story 2.3 section-linked success response model, added service/controller mapping flow, expanded unit/e2e coverage, and validated full quality gates; status set to `review`.
- **2026-05-06:** Addressed code review findings (5 patch items resolved) and re-ran full quality gates; status set to `done`.
