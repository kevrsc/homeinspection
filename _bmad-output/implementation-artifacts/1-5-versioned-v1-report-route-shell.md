# Story 1.5: Versioned `v1` report route shell

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an API consumer,  
I want the upload capability exposed under a stable versioned path,  
so that integrations can pin to `v1` semantics (FR18, NFR12).

## Acceptance Criteria

1. **AC1 - Route shell exists at versioned path**  
   **Given** the application is running,  
   **When** a client issues `POST /v1/report/upload`,  
   **Then** the route exists and does not return 404.

2. **AC2 - Structured response for shell behavior**  
   **Given** the upload shell is invoked without the full file pipeline implemented yet,  
   **When** request validation/auth constraints are applied,  
   **Then** the endpoint returns a structured response/error shape aligned with existing v1 envelope conventions.

3. **AC3 - No unversioned equivalent advertised**  
   **Given** current Phase 1 scope,  
   **When** routes are reviewed and tested,  
   **Then** no unversioned upload route (`/report/upload`) is treated as supported.

4. **AC4 - Quality gates**  
   **Given** implementation is complete,  
   **When** running `npm run lint`, `npm run build`, `npm run test`, and `npm run test:e2e` in `homeinspection-api/`,  
   **Then** all pass with no regressions in Stories 1.1-1.4 behavior.

## Tasks / Subtasks

- [x] **T1 - Create report module route shell** (AC: 1, 3)  
  - [x] Add versioned controller route for `POST /v1/report/upload`.  
  - [x] Keep implementation shell-focused (no extraction pipeline yet).

- [x] **T2 - Ensure envelope-compatible behavior** (AC: 2)  
  - [x] Reuse existing global error handling and request-id propagation from Story 1.4/1.3.  
  - [x] Return deterministic structured output for current shell behavior.

- [x] **T3 - Add tests for route presence and versioning** (AC: 1, 3, 4)  
  - [x] Add e2e coverage proving `/v1/report/upload` is reachable (non-404).  
  - [x] Add assertion that unversioned `/report/upload` is not the supported path.

- [x] **T4 - Validate full quality gates** (AC: 4)  
  - [x] Run lint/build/test/e2e and fix any regressions.

## Dev Notes

### Architecture and sequencing context

- Story 1.4 is complete and provides stable error envelope + request correlation foundations.
- Story 1.6 (auth) and Story 1.7 (rate limiting) may further constrain this route; keep 1.5 shell lightweight and compatible with upcoming guards.
- Keep all routes under `/v1` for contract stability.

### Guardrails

- Do not introduce extraction logic in this story.
- Keep route behavior deterministic and aligned with existing error envelope conventions.
- Avoid adding new dependencies unless strictly required.

### References

1. `_bmad-output/planning-artifacts/epics.md`
2. `_bmad-output/planning-artifacts/architecture.md`
3. `_bmad-output/implementation-artifacts/1-4-global-exception-filter-and-stable-error-json-envelope.md`
4. `_bmad-output/project-context.md`

## Dev Agent Record

### Agent Model Used

Codex 5.3

### Debug Log References

- `npm run test:e2e -- --runInBand test/app.e2e-spec.ts`
- `npm run lint; npm run build; npm run test; npm run test:e2e`

### Completion Notes List

- Added `ReportModule` and `ReportController` with versioned route shell `POST /v1/report/upload`.
- Shell handler intentionally throws `BadRequestException` with deterministic payload fields (`message`, `details`) so Story 1.4 global filter produces stable error envelope.
- Verified versioning behavior: `/v1/report/upload` is present and non-404; unversioned `/report/upload` remains unsupported (404).
- Reused existing request-id middleware/interceptor/filter stack from Stories 1.3-1.4 to preserve `X-Request-Id` and `error.requestId` parity.
- All quality gates pass: lint, build, unit tests, and e2e tests.

### File List

- `_bmad-output/implementation-artifacts/1-5-versioned-v1-report-route-shell.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `homeinspection-api/src/app.module.ts`
- `homeinspection-api/src/modules/report/report.module.ts`
- `homeinspection-api/src/modules/report/report.controller.ts`
- `homeinspection-api/test/app.e2e-spec.ts`

---

## Change Log

- **2026-05-05:** Story created and set to `ready-for-dev`.
- **2026-05-05:** Implemented versioned report upload route shell, added versioning e2e coverage, and passed full quality gates; status set to `review`.
