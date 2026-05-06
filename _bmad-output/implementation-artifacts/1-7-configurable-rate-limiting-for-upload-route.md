# Story 1.7: Configurable rate limiting for upload route

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a prototype maintainer,  
I want rate limiting applied to the upload endpoint using a 60-minute governance window,  
so that burst traffic cannot destabilize the prototype (FR21-FR23, NFR15, NFR3).

## Acceptance Criteria

1. **AC1 - Enforce configured request budget on upload route**  
   **Given** the configured rate-limit window and request budget,  
   **When** a client exceeds the allowed requests for `POST /v1/report/upload`,  
   **Then** the API returns 429 with structured error semantics.

2. **AC2 - Distinct classification from validation errors**  
   **Given** a throttled upload request,  
   **When** the response is produced,  
   **Then** the error is explicitly rate-limit classified and distinct from validation failures.

3. **AC3 - Environment-driven limits**  
   **Given** `RATE_LIMIT_WINDOW_MINUTES` and `RATE_LIMIT_MAX_REQUESTS`,  
   **When** configuration values change,  
   **Then** middleware behavior reflects the new limits without code changes.

4. **AC4 - Quality gates**  
   **Given** implementation is complete,  
   **When** running `npm run lint`, `npm run build`, `npm run test`, and `npm run test:e2e`,  
   **Then** all pass with no regressions in Stories 1.1-1.6 behavior.

## Tasks / Subtasks

- [x] **T1 - Implement upload-route rate-limit middleware** (AC: 1, 2, 3)  
  - [x] Add middleware that enforces request counts in configured window for `POST /v1/report/upload`.  
  - [x] Return deterministic structured 429 payload details for rate-limit failures.

- [x] **T2 - Wire middleware to upload route only** (AC: 1, 2)  
  - [x] Register middleware in `AppModule` for `POST /v1/report/upload` only.  
  - [x] Preserve request-id and auth guard behavior.

- [x] **T3 - Add tests for throttling behavior** (AC: 1, 2, 3, 4)  
  - [x] Add e2e test that proves first requests pass and over-budget request returns 429 envelope.  
  - [x] Ensure error classification is distinct from validation errors.

- [x] **T4 - Validate full quality gates** (AC: 4)  
  - [x] Run lint/build/test/e2e and resolve regressions.

## Dev Notes

### Context

- Story 1.6 already enforces auth for upload route.
- Story 1.4 provides stable error envelope and request-id behavior.
- Story 1.2 already validates `RATE_LIMIT_WINDOW_MINUTES` and `RATE_LIMIT_MAX_REQUESTS`.

### Guardrails

- Apply rate limiting only to upload route for this story scope.
- Use environment-driven settings; no hardcoded thresholds.
- Keep implementation deterministic and testable.

## Dev Agent Record

### Agent Model Used

Codex 5.3

### Debug Log References

- `npm run test:e2e -- --runInBand test/app.e2e-spec.ts`
- `npm run lint; npm run build; npm run test; npm run test:e2e`

### Completion Notes List

- Added `RateLimitMiddleware` with environment-driven window/max request settings from validated config.
- Applied middleware only to `POST /v1/report/upload` in `AppModule`.
- Implemented deterministic 429 response payload with explicit rate-limit classification and `requestId` to keep behavior distinct from validation failures.
- Added e2e throttling test that confirms over-budget requests return 429 with rate-limit details.
- Added e2e test setup rate-limit values and per-test middleware state reset to keep tests deterministic.
- Full quality gates pass: lint, build, unit tests, and e2e tests.

### File List

- `_bmad-output/implementation-artifacts/1-7-configurable-rate-limiting-for-upload-route.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `homeinspection-api/src/common/middleware/rate-limit.middleware.ts`
- `homeinspection-api/src/app.module.ts`
- `homeinspection-api/test/jest-e2e.setup.ts`
- `homeinspection-api/test/app.e2e-spec.ts`

---

## Change Log

- **2026-05-05:** Story created and moved to `in-progress` for direct implementation.
- **2026-05-05:** Implemented upload-route rate limiting with 429 classification, added e2e throttling coverage, and passed full quality gates; status set to `review`.
