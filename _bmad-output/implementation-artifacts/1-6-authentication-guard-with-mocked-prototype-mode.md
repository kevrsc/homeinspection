# Story 1.6: Authentication guard with mocked prototype mode

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a prototype operator,  
I want authentication enforced on the upload route with a mock-friendly configuration,  
so that we can test locally and in CI without secrets while still proving the guard path (FR19, FR20, NFR4, NFR7).

## Acceptance Criteria

1. **AC1 - Mock mode pass path**  
   **Given** mock auth mode enabled via configuration,  
   **When** a request includes the documented mock credential header or token,  
   **Then** the request passes the guard.

2. **AC2 - Unauthorized path**  
   **Given** mock auth disabled or credentials are missing/invalid,  
   **When** a request lacks valid credentials,  
   **Then** the API returns 401 with the stable error envelope and `requestId`.

3. **AC3 - Scope control**  
   **Given** Story 1.6 scope,  
   **When** guards are applied,  
   **Then** auth enforcement is applied to upload route behavior without breaking existing request-id and error-envelope foundations.

4. **AC4 - Quality gates**  
   **Given** implementation is complete,  
   **When** running `npm run lint`, `npm run build`, `npm run test`, and `npm run test:e2e` in `homeinspection-api/`,  
   **Then** all pass with no regressions in Stories 1.1-1.5 behavior.

## Tasks / Subtasks

- [x] **T1 - Implement auth guard with mock + live modes** (AC: 1, 2, 3)  
  - [x] Add a guard for upload route authentication.  
  - [x] In mock mode, validate configured header name/value.  
  - [x] In live mode, validate API key/token against configured keys.

- [x] **T2 - Apply guard to upload route shell** (AC: 1, 2, 3)  
  - [x] Enforce guard on `POST /v1/report/upload`.  
  - [x] Preserve existing versioned route behavior and error envelope integration.

- [x] **T3 - Add e2e coverage for auth success/failure** (AC: 1, 2, 4)  
  - [x] Add test proving mock credential passes guard path.  
  - [x] Add test proving missing/invalid credentials return 401 structured envelope with `requestId`.

- [x] **T4 - Validate full quality gates** (AC: 4)  
  - [x] Run lint/build/test/e2e and resolve regressions.

## Dev Notes

### Context

- Story 1.4 established stable error envelope and request-id parity for failures.
- Story 1.5 established `POST /v1/report/upload` shell route under `v1`.
- Auth configuration and validation scaffolding already exists (`AUTH_MODE`, `MOCK_AUTH_HEADER_NAME`, `MOCK_AUTH_HEADER_VALUE`, `API_KEYS`).

### Guardrails

- Do not add new dependencies for auth.
- Keep auth decisioning simple and deterministic for prototype phase.
- Continue to rely on global exception filter for public 401 envelope.

## Dev Agent Record

### Agent Model Used

Codex 5.3

### Debug Log References

- `npm run test:e2e -- --runInBand test/app.e2e-spec.ts`
- `npm run lint; npm run build; npm run test; npm run test:e2e`

### Completion Notes List

- Implemented `ApiKeyGuard` with deterministic mock and live auth paths using validated config from `getAppConfig`.
- Mock mode now enforces configured header name/value; live mode accepts configured API keys from `Authorization: Bearer <key>` or `x-api-key`.
- Applied auth guard to `POST /v1/report/upload` while preserving existing versioned route shell and Story 1.4 envelope behavior.
- Added e2e coverage for mock-auth pass and missing-auth 401 envelope with `requestId` parity.
- Full quality gates pass: lint, build, unit tests, and e2e tests.

### File List

- `_bmad-output/implementation-artifacts/1-6-authentication-guard-with-mocked-prototype-mode.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `homeinspection-api/src/common/guards/api-key.guard.ts`
- `homeinspection-api/src/modules/report/report.controller.ts`
- `homeinspection-api/src/modules/report/report.module.ts`
- `homeinspection-api/test/app.e2e-spec.ts`

---

## Change Log

- **2026-05-05:** Story created and moved to `in-progress` for direct implementation.
- **2026-05-05:** Implemented authentication guard with mock/live modes, added e2e auth coverage, and passed full quality gates; status set to `review`.
