# Story 1.4: Global exception filter and stable error JSON envelope

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an API consumer,  
I want failures to return a deterministic JSON structure with code, message, and request context,  
so that clients can parse errors without ad-hoc string matching (FR14, FR17, NFR6, NFR9, NFR13).

## Acceptance Criteria

1. **AC1 - Stable v1 error envelope on handled failures**  
   **Given** an `HttpException` or equivalent application error in an HTTP request,  
   **When** the global exception filter serializes the response,  
   **Then** the payload shape is stable and deterministic:  
   `{ "error": { "code": string, "message": string, "requestId": string, "details"?: object | array | string | null } }`  
   **And** field names remain consistent with Story 1.3 conventions and planned OpenAPI alignment.

2. **AC2 - No sensitive/internal leakage**  
   **Given** an unhandled/internal exception path,  
   **When** the filter maps it to a client response,  
   **Then** stack traces, class names, and internal implementation details are not returned in the payload (NFR6).  
   **And** the response message is safe and actionable at API-consumer level.

3. **AC3 - Request ID parity with Story 1.3**  
   **Given** any failure response produced by the global filter,  
   **When** the response is sent,  
   **Then** `error.requestId` equals the same correlation id exposed via `X-Request-Id` and `req.requestId` from Story 1.3.

4. **AC4 - Deterministic status-class behavior**  
   **Given** equivalent failure conditions,  
   **When** requests are repeated,  
   **Then** HTTP status class and `error.code` classification are consistent (no random/shape drift across responses).

5. **AC5 - Quality gates**  
   **Given** implementation is complete,  
   **When** running `npm run lint`, `npm run build`, `npm run test`, and `npm run test:e2e` in `homeinspection-api/`,  
   **Then** all pass with no regressions in Stories 1.1-1.3 behavior.

## Tasks / Subtasks

- [x] **T1 - Add global HTTP exception filter** (AC: 1, 2, 3, 4)  
  - [x] Create `homeinspection-api/src/common/filters/http-exception.filter.ts` implementing a catch-all Nest exception filter for HTTP context only.  
  - [x] Normalize `HttpException` response payloads and unknown errors into the stable envelope.  
  - [x] Ensure `error.requestId` is read from `req.requestId` (or `getRequestIdFromExecutionContext`) and never regenerated.

- [x] **T2 - Define reusable error-code classification constants** (AC: 1, 4)  
  - [x] Create/extend `homeinspection-api/src/shared/errors/error-codes.ts` for canonical codes used by this story (for example `VALIDATION_FAILED`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL_ERROR`).  
  - [x] Keep mapping deterministic: same input class -> same `error.code`.

- [x] **T3 - Wire filter globally using existing module patterns** (AC: 1, 3)  
  - [x] Register filter in `homeinspection-api/src/common/common.module.ts` via `APP_FILTER` provider (preferred for parity with current global interceptor registration).  
  - [x] Preserve Story 1.3 middleware/interceptor ordering and behavior (`RequestIdMiddleware`, `RequestIdInterceptor`, `LoggingInterceptor`).

- [x] **T4 - Add regression and envelope tests** (AC: 1, 2, 3, 4, 5)  
  - [x] Extend `homeinspection-api/test/app.e2e-spec.ts` (or add dedicated e2e spec) with at least one deterministic failure-path assertion validating envelope shape and `error.requestId`.  
  - [x] Add/extend unit tests for mapping logic in filter helper functions (status -> code, sanitized message behavior).
  - [x] Ensure existing Story 1.3 assertions (`X-Request-Id` on success/404) remain green.

- [x] **T5 - Document contract and hand-off boundaries** (AC: 1, 2, 3)  
  - [x] Update `homeinspection-api/README.md` with the stable error envelope contract and note that `requestId` must match `X-Request-Id`.  
  - [x] Keep OpenAPI alignment note in scope for Story 2.8 while preserving current deterministic runtime behavior.

## Dev Notes

### Epic context and value

- Epic 1 objective is a governed API foundation; Story 1.4 is the contract-stability layer for all failure paths before auth/rate-limit and upload extraction stories expand traffic.  
- This story directly supports FR14/FR17 and NFR6/NFR9/NFR13 by forcing deterministic, non-leaky error semantics.

### Story-specific technical requirements

- Do not create competing error envelopes in controllers/services; keep shaping centralized in one global filter.
- Treat this as a contract story, not a transport rewrite: no route changes, no extraction logic, no auth redesign.
- Keep JSON property naming `camelCase` and deterministic key names to support downstream OpenAPI lock-in.

### Architecture compliance guardrails

- Continue current Nest structure: cross-cutting framework concerns in `src/common/`, shared primitives in `src/shared/`.
- Preserve ports/adapters discipline: this story stays in HTTP boundary and shared typing, not domain logic.
- Keep errors mapped at the HTTP boundary only (architecture explicitly calls for centralized filter behavior).

### File structure requirements

- **New files expected**
  - `homeinspection-api/src/common/filters/http-exception.filter.ts`
  - `homeinspection-api/src/shared/errors/error-codes.ts` (if not already present)
- **Likely update files**
  - `homeinspection-api/src/common/common.module.ts`
  - `homeinspection-api/test/app.e2e-spec.ts`
  - `homeinspection-api/README.md`
- **Files to preserve behavior**
  - `homeinspection-api/src/app.module.ts` (request-id middleware registration)
  - `homeinspection-api/src/common/middleware/request-id.middleware.ts`
  - `homeinspection-api/src/common/interceptors/request-id.interceptor.ts`
  - `homeinspection-api/src/common/interceptors/logging.interceptor.ts`
  - `homeinspection-api/src/common/request-context.ts`

### Existing code intelligence (must preserve)

- `RequestIdMiddleware` currently sets `X-Request-Id` early, including non-2xx paths such as 404; Story 1.4 must not break this guarantee.
- `CommonModule` already registers global interceptors via Nest `APP_INTERCEPTOR`; global filter registration should follow the same provider style.
- `getRequestIdFromExecutionContext` throws when request id is unavailable; the filter must run in HTTP context where request id already exists from middleware.

### Previous story intelligence (1.3)

- Story 1.3 explicitly deferred full error envelope implementation to this story; do not duplicate request-id generation logic here.
- Review findings from 1.3 stressed HTTP-only context checks and preserving request id across all response classes; this same rigor applies to filter implementation.
- Existing e2e tests already assert correlation header presence; extend tests, do not replace these assertions.

### Git intelligence summary

- Recent commits are story-scoped and small (`1.1` scaffold -> `1.2` config/env -> `1.3` correlation id), with updates concentrated under `homeinspection-api/src/common/` and `test/`.
- Follow current commit/code pattern: focused cross-cutting infrastructure changes with explicit tests and README updates.

### Library and framework requirements

- NestJS runtime in repo is `@nestjs/common/core/platform-express` `^11.0.1`; implement using Nest 11 exception-filter APIs and `ArgumentsHost`.
- Node engine is `>=20.18.0 <25`; no additional UUID library is needed (reuse existing `crypto.randomUUID()` infrastructure from Story 1.3 where applicable).
- No new heavy dependencies required for this story.

### Latest technical information (May 2026 snapshot)

- Current Nest docs and ecosystem guidance continue to favor global exception filters for centralized, deterministic error responses.
- Best practice remains: catch broad exceptions at HTTP edge, map to stable payloads, and include request correlation context for operations/support.
- Keep internal error diagnostics in server logs, not client payloads.

### Testing requirements

- Required automated checks for completion: `lint`, `build`, unit tests, and e2e tests.
- Add assertions for:
  - envelope shape stability (`error.code`, `error.message`, `error.requestId`, optional `details`)
  - parity between header `X-Request-Id` and body `error.requestId`
  - sanitization/no stack traces in client payload
- Maintain regression checks for Story 1.3 request-id behavior.

### UX and consumer contract notes

- UX artifacts emphasize action-first, deterministic failures and request correlation; this story supplies the runtime foundation for those UX expectations.
- Keep public message text concise and recoverable for integrator/client mapping without exposing internals.

### References

1. `_bmad-output/planning-artifacts/epics.md` (Epic 1, Story 1.4, FR/NFR mapping)
2. `_bmad-output/planning-artifacts/architecture.md` (error envelope pattern, boundaries, folder structure)
3. `_bmad-output/planning-artifacts/prd.md` (FR14/FR17, NFR6/NFR9/NFR13)
4. `_bmad-output/planning-artifacts/ux-design-specification.md` (deterministic error UX expectations)
5. `_bmad-output/implementation-artifacts/1-3-request-correlation-id-on-every-http-request.md` (handoff and existing request-id guarantees)
6. `_bmad-output/project-context.md` (agent implementation guardrails)

## Dev Agent Record

### Agent Model Used

Codex 5.3

### Debug Log References

- `npm run test -- src/common/filters/http-exception.filter.spec.ts`
- `npm run test:e2e -- --runInBand test/app.e2e-spec.ts`
- `npm run lint`
- `npm run build`
- `npm run test`
- `npm run test:e2e`
- `npm run lint; npm run build; npm run test; npm run test:e2e`

### Completion Notes List

- Implemented `HttpExceptionFilter` as a global catch-all HTTP filter with deterministic envelope output: `error.code`, `error.message`, `error.requestId`, and optional `error.details`.
- Added reusable status-to-error-code mapping in `src/shared/errors/error-codes.ts` and exported helper builder functions for unit verification.
- Registered the filter through `APP_FILTER` in `CommonModule`, preserving Story 1.3 middleware/interceptor flow and request-id parity.
- Extended e2e coverage to assert 404 responses now return the stable envelope and that `error.requestId` equals response `X-Request-Id`.
- Added a 500-path e2e hardening assertion using a test-only throw route to verify sanitized internal error envelope and `requestId` parity with `X-Request-Id`.
- Added unit tests for deterministic code mapping, `HttpException` envelope normalization, and sanitization of unexpected internal errors.
- Updated README with the v1 error-envelope contract and explicit OpenAPI alignment note for Story 2.8.
- Verified full quality gates pass: lint, build, unit tests, and e2e tests (including new 500-path coverage).

### File List

- `_bmad-output/implementation-artifacts/1-4-global-exception-filter-and-stable-error-json-envelope.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `homeinspection-api/src/common/filters/http-exception.filter.ts`
- `homeinspection-api/src/common/filters/http-exception.filter.spec.ts`
- `homeinspection-api/src/common/common.module.ts`
- `homeinspection-api/src/shared/errors/error-codes.ts`
- `homeinspection-api/test/app.e2e-spec.ts`
- `homeinspection-api/README.md`

---

## Change Log

- **2026-05-05:** Story created via `bmad-create-story`; status set to `ready-for-dev`.
- **2026-05-05:** Implemented global exception filter, deterministic error-code mapping, regression/unit tests, and README contract updates; status set to `review`.
- **2026-05-05:** Added 500-path e2e hardening test and re-ran full quality gates; status set to `done`.
