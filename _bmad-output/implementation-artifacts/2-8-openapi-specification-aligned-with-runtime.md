# Story 2.8: OpenAPI specification aligned with runtime

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an API consumer,  
I want OpenAPI definitions and examples that match actual responses,  
so that I can integrate without an SDK (FR35, UX-DR1).

## Acceptance Criteria

1. **AC1 - Upload endpoint contract documented and runtime-aligned**  
   **Given** the implemented upload route and current DTO/error contracts,  
   **When** OpenAPI is generated or updated,  
   **Then** `POST /v1/report/upload` documents multipart request shape, 200 success schema, and all currently supported error classes with runtime-aligned field names.

2. **AC2 - Examples include request correlation placeholders**  
   **Given** structured error responses include request correlation context,  
   **When** OpenAPI examples are published,  
   **Then** error examples include `requestId` placeholder values and deterministic `code`/`details` fields that match runtime behavior.

3. **AC3 - Drift detection path exists**  
   **Given** the OpenAPI contract can drift from implementation,  
   **When** CI or local quality gates run,  
   **Then** there is a documented and executable drift-check step (snapshot, generated artifact check, or equivalent reproducible validation).

4. **AC4 - Regression-safe quality gates**  
   **Given** OpenAPI support is added,  
   **When** running `npm run lint`, `npm run build`, `npm run test`, and `npm run test:e2e`,  
   **Then** all pass and existing route/error runtime behavior remains unchanged.

## Tasks / Subtasks

- [x] **T1 - Define OpenAPI strategy and scope for v1 upload route** (AC: 1, 2, 3)  
  - [x] Choose and implement contract publication strategy (Nest decorators + SwaggerModule and/or committed spec artifact).  
  - [x] Define authoritative source for error response examples aligned with existing runtime taxonomy.

- [x] **T2 - Add OpenAPI metadata for upload route and payloads** (AC: 1, 2)  
  - [x] Annotate request body (`multipart/form-data`, file field) and success schema for `POST /v1/report/upload`.  
  - [x] Annotate supported error responses (validation, extraction failure, timeout, auth, rate limit) with runtime-aligned examples containing `requestId`.

- [x] **T3 - Add reproducible drift-check workflow** (AC: 3, 4)  
  - [x] Add a deterministic command/script or documented step to generate/verify spec alignment.  
  - [x] Ensure this check can be run locally and in CI without external services.

- [x] **T4 - Add/adjust automated tests for contract alignment guardrails** (AC: 1, 2, 3, 4)  
  - [x] Add focused tests for documented schemas/examples or drift-check script behavior as appropriate.  
  - [x] Keep existing e2e behavioral tests intact and ensure OpenAPI work does not alter runtime contract semantics.

- [x] **T5 - Validate full quality gates and no-regression behavior** (AC: 4)  
  - [x] Run `npm run lint`, `npm run build`, `npm run test`, and `npm run test:e2e`.  
  - [x] Confirm no breaking change to existing upload route response semantics.

### Review Findings

- [x] [Review][Patch] Document oversized-upload error (`413`) in OpenAPI to match runtime behavior [homeinspection-api/src/modules/report/report.controller.ts]
- [x] [Review][Patch] Make drift check fail when `openapi/openapi.json` is untracked or missing (current `git diff` check can false-pass) [homeinspection-api/package.json]
- [x] [Review][Patch] Document upload auth requirement with OpenAPI security metadata (guard exists but contract omits security scheme/requirement) [homeinspection-api/src/modules/report/report.controller.ts]
- [x] [Review][Patch] Eliminate duplicated OpenAPI builder/config between runtime setup and generation script to prevent silent contract drift [homeinspection-api/src/app.setup.ts]
- [x] [Review][Patch] Strengthen OpenAPI e2e guardrail beyond path presence (assert critical request/response statuses and auth metadata) [homeinspection-api/test/app.e2e-spec.ts]

## Dev Notes

### Epic and Story Context

- Story 2.1-2.7 established the current runtime contract for `POST /v1/report/upload`.
- Existing behavior includes deterministic success payload, deterministic error envelope taxonomy, timeout classification, rate limiting, and structured completion logging.
- Story 2.8 is contract publication and alignment work; it must describe current behavior rather than redefine it.

### Current Runtime Baseline (Must Read Before Coding)

- Route implementation and validation/extraction flow:  
  - `homeinspection-api/src/modules/report/report.controller.ts`  
  - `homeinspection-api/src/modules/report/report.service.ts`
- Success DTO currently represented by:
  - `homeinspection-api/src/modules/report/dto/extraction-response.dto.ts`
- Error envelope and top-level/detail code mapping currently represented by:
  - `homeinspection-api/src/common/filters/http-exception.filter.ts`
  - `homeinspection-api/src/shared/errors/error-codes.ts`
- App bootstrap currently has no Swagger/OpenAPI wiring:
  - `homeinspection-api/src/main.ts`

### Architecture and Boundary Guardrails

- Keep route fixed at `POST /v1/report/upload` under `v1`; no route renaming or version drift.
- Do not change runtime error taxonomy semantics while documenting them.
- Preserve deterministic envelope format and request-id behavior.
- Prefer using existing DTO/type definitions as the source for schema alignment.
- If introducing new OpenAPI dependencies (e.g., `@nestjs/swagger`), ensure manifest updates are explicit and minimal.

### Technical Requirements for This Story

- OpenAPI must clearly document:
  - multipart file upload field and content type
  - 200 success schema fields (`pageCount`, `sections`, `sectionName`, `observations[].text`)
  - representative error schemas/examples with `requestId`
- Error examples should reflect currently observed classes:
  - validation (`VALIDATION_FAILED`)
  - extraction failure (`EXTRACTION_FAILED`)
  - extraction timeout (`EXTRACTION_TIMEOUT`)
  - auth/rate-limit classes
- Drift-check must be deterministic and scriptable.

### Required File Targets (Expected)

- **Likely updated**
  - `homeinspection-api/src/main.ts` (Swagger/OpenAPI bootstrap wiring if adopted)
  - `homeinspection-api/src/modules/report/report.controller.ts` (route-level OpenAPI decorators)
  - `homeinspection-api/src/modules/report/dto/extraction-response.dto.ts` (if class-based DTO metadata is needed)
  - `homeinspection-api/package.json` / `homeinspection-api/package-lock.json` (if OpenAPI dependencies/scripts are added)
  - `homeinspection-api/test/app.e2e-spec.ts` (if contract-alignment checks are added here)
- **Likely new**
  - `homeinspection-api/openapi/` artifact file (e.g., `openapi.json`) and/or helper script
  - contract drift-check test/spec file if separate from existing tests

### Previous Story Intelligence (2.7)

- Story 2.7 added structured completion logging and reinforced deterministic classification behavior.
- Review closeout accepted two follow-ups as next-iteration items (aborted-request completion logging and requestId fallback robustness); avoid coupling OpenAPI scope to those changes.
- Keep OpenAPI work scoped to runtime contract alignment, not broader observability refactoring.

### Git Intelligence Summary

- Recent Epic 2 commits consistently implement deterministic runtime behavior first, then reinforce with tests:
  - `c40c2fd` Story 2.7 structured upload outcome logging
  - `5e59d5c` Story 2.6 fixture-driven e2e coverage
  - `638884c` Story 2.5 timeout guard and cancellation
  - `4419d51` Story 2.4 deterministic extraction failure classification
  - `43c0087` Story 2.3 section-linked response model
- Follow same pattern: runtime-aligned OpenAPI documentation + deterministic validation guardrail tests.

### Latest Technical Information

- Current NestJS OpenAPI support is typically provided via `@nestjs/swagger` decorators plus bootstrap wiring in `main.ts`.
- Best practice for this project phase: align OpenAPI examples with actual serialized runtime envelopes and avoid hand-maintained divergent docs.
- Prefer deterministic generation/check workflow over ad-hoc manual documentation updates.

### Testing Requirements

- Add tests or checks that fail on contract drift when implementation changes without docs/spec updates.
- Reuse existing e2e scenarios for payload shape reference where possible.
- Keep all tests local and deterministic with no cloud dependency.

### Project Context Reference

- Follow `_bmad-output/project-context.md`:
  - deterministic, repeatable behavior
  - strict boundary typing and no sensitive leaks
  - explicit contract discipline and no silent drift
  - no real cloud dependencies in test paths

## Dev Agent Record

### Agent Model Used

Codex 5.3

### Debug Log References

- Story auto-discovered from sprint backlog after Story 2.7 completion.
- Loaded epics, architecture, project context, and current runtime code surface for upload contract.
- Verified current repository state has no existing OpenAPI wiring files under `homeinspection-api`.
- Added Swagger wiring in app setup and route-level OpenAPI decorators aligned to upload runtime contracts.
- Added deterministic OpenAPI generation/check workflow and regenerated committed spec artifact.
- Executed quality gates: `npm run lint`, `npm run build`, `npm run test`, `npm run test:e2e`, and `npm run openapi:check`.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Implemented OpenAPI publication at `/openapi.json` with route contract metadata for `POST /v1/report/upload`.
- Added runtime-aligned success and error response examples, including `requestId` placeholders and deterministic code/details fields.
- Added reproducible drift detection scripts: `openapi:generate` and `openapi:check`.
- Added e2e guardrail asserting OpenAPI JSON includes `/v1/report/upload`.
- Resolved review patches: added `413` OpenAPI response, declared API key security, centralized OpenAPI doc creation, hardened drift-check script, and expanded e2e contract assertions.

### File List

- `_bmad-output/implementation-artifacts/2-8-openapi-specification-aligned-with-runtime.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `homeinspection-api/openapi/openapi.json`
- `homeinspection-api/package-lock.json`
- `homeinspection-api/package.json`
- `homeinspection-api/scripts/generate-openapi.ts`
- `homeinspection-api/src/app.setup.ts`
- `homeinspection-api/src/main.ts`
- `homeinspection-api/src/modules/report/report.controller.ts`
- `homeinspection-api/src/openapi/upload.openapi.ts`
- `homeinspection-api/test/app.e2e-spec.ts`

---

## Change Log

- **2026-05-06:** Story created via `bmad-create-story`; status set to `ready-for-dev`.
- **2026-05-06:** Implemented OpenAPI runtime-aligned upload contract documentation, deterministic spec generation/check, and e2e guardrail coverage; status set to `review`.
- **2026-05-06:** Applied all Story 2.8 review patches and moved story status to `done`.
