# Story 1.3: Request correlation ID on every HTTP request

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **API consumer**,  
I want **every response to include or echo a unique request correlation identifier**,  
So that **I can align logs, support tickets, and client telemetry (FR6)**.

## Acceptance Criteria

1. **AC1 — Correlation id on every HTTP response**  
   **Given** any inbound HTTP request to the Nest application,  
   **When** the server finishes handling the request (success **or** failure at the HTTP layer),  
   **Then** the response includes a **stable correlation identifier** exposed as an HTTP header (choose one canonical name for Phase 1, e.g. **`X-Request-Id`** or **`Request-Id`**, and use it consistently).  
   **And** if the client sends a supported incoming correlation header with a **non-empty** value, the server **may** echo or normalize it per your documented rules; if absent or invalid, the server **generates** a new unique id (use **`crypto.randomUUID()`** from Node’s `crypto` module unless you document a different standard).

2. **AC2 — Same id in server logs for that request**  
   **Given** the default application logging path used for HTTP handling (Nest `Logger` or a thin wrapper you register in this story),  
   **When** at least one log line is emitted while processing a single request (e.g. controller/service path),  
   **Then** that log entry includes the **same** correlation id string as in AC1 (field name **`requestId`** in structured context, or a clearly documented equivalent such as `context: '<uuid>'`).  
   **And** logs remain free of secrets and raw bodies (align with Architecture logging rules).

3. **AC3 — Request-scoped id for downstream stories**  
   **Given** Story **1.4** will add a global exception filter that must populate **`error.requestId`** in JSON,  
   **When** any HTTP-bound code runs after your middleware/interceptor chain attaches the id,  
   **Then** the correlation id is reachable from the Nest **`ExecutionContext`** / Express **`Request`** (document the exact mechanism: e.g. **`req.requestId`**, `req.headers`, or a small **`RequestContextService`** using `REQUEST` scope).  
   **Note:** Story **1.4** owns the **full** error envelope; **this story** must **not** duplicate the complete filter—only ensure the **id is available** so 1.4 can read it without regenerating or forking ids.

4. **AC4 — Epic alignment (error JSON)**  
   **Given** the epic sentence: *“error JSON bodies include `requestId` … for all error paths **handled by the global filter**”*,  
   **When** Story **1.4** is implemented,  
   **Then** that filter must use the **same** correlation id from AC3 (traceability to FR6 / Epic AC).  
   **For Story 1.3 verification:** add at least one automated test proving an **`HttpException`** (or equivalent) path **can** read the same id from the request/context **before** 1.4 exists (smoke / wiring test), **or** document the hand-off explicitly in Dev Notes and add an e2e assertion on the **response header** only—pick **one** approach and record it in the Dev Agent Record.

5. **AC5 — Quality gates**  
   **Given** the implementation is complete,  
   **When** the developer runs **`npm run lint`**, **`npm run build`**, **`npm run test`**, and **`npm run test:e2e`** from `homeinspection-api/`,  
   **Then** all complete successfully with **no regressions** from Stories **1.1–1.2**.

## Tasks / Subtasks

- [x] **T1 — Request id assignment (middleware or guard)** (AC: 1, 3)  
  - [x] Add **`homeinspection-api/src/common/middleware/request-id.middleware.ts`** (or equivalent Nest middleware) that runs **early** for all routes: parse optional incoming header (`x-request-id` / `X-Request-Id` — pick one convention), validate non-empty string, else generate **`randomUUID()`**.  
  - [x] Attach the resolved id to the request object (e.g. **`req.requestId`**) and extend TypeScript types (**`src/types/express.d.ts`** or similar **declaration merging** for `Express.Request`) so usage is type-safe.  
  - [x] Register middleware in **`main.ts`** with `app.use(...)` **after** `NestFactory.create` **or** via `NestModule.configure` + `MiddlewareConsumer` in **`AppModule`** — choose one pattern and document why.

- [x] **T2 — Response header + optional interceptor** (AC: 1)  
  - [x] Add **`homeinspection-api/src/common/interceptors/request-id.interceptor.ts`** (filename aligns with Architecture tree) that ensures the response includes the canonical correlation header with the **same** value as `req.requestId`.  
  - [x] Register the interceptor **globally** in **`main.ts`** via `app.useGlobalInterceptors(...)` **or** provider-scoped registration consistent with Nest 11 docs—prefer **one** global registration path.

- [x] **T3 — Logging with `requestId`** (AC: 2)  
  - [x] Add **`homeinspection-api/src/common/interceptors/logging.interceptor.ts`** (Architecture placeholder name) **or** extend **`AppController` / `AppService`** with a **single** demonstrative `Logger` call that includes **`requestId`** in the log payload/context for the happy path.  
  - [x] Do **not** introduce a new logging platform (no **pino**/**winston**) unless already in `package.json`; use Nest **`Logger`** with structured fields where supported, or a minimal wrapper that prefixes `[requestId=<uuid>]` in the message string.

- [x] **T4 — Module wiring** (AC: 3, 5)  
  - [x] Export/build a **`CommonModule`** **or** keep providers in **`AppModule`**—follow Architecture preference: cross-cutting pieces under **`src/common/`**.  
  - [x] Ensure **`ConfigModule`** / **`getAppConfig`** / **`validateEnv`** behavior from Story **1.2** remains unchanged (e2e **`jest-e2e.setup.ts`** env continues to satisfy boot).

- [x] **T5 — Tests** (AC: 1–5)  
  - [x] **Unit tests** for middleware/interceptor helpers (pure functions for header parsing + UUID fallback).  
  - [x] **E2E:** extend **`test/app.e2e-spec.ts`** (or add **`request-id.e2e-spec.ts`**) to assert the correlation header is present on **`GET /`** and optionally that a client-supplied id is echoed when valid.  
  - [x] If you chose AC4 “smoke test with `HttpException`”, add the minimal test case; otherwise document the hand-off in Dev Agent Record and rely on header e2e.

- [x] **T6 — Documentation** (AC: 1, 3)  
  - [x] Add a short subsection to **`README.MD`** (root) or **`homeinspection-api/README.md`** describing the correlation header name and whether clients may supply their own id.

### Review Findings

- [x] **[Review][Decision] Correlation header on guard / early-reject HTTP responses** — **AC1.** Nest runs **guards before interceptors**, so **`RequestIdInterceptor` alone** cannot guarantee **`X-Request-Id`** on every status path. **Resolution (2026-05-04):** **`RequestIdMiddleware`** now calls **`res.setHeader(X-Request-Id, req.requestId)`** immediately after resolving the id so express/Nest responses (**404**, guard denials that still flow through middleware + Express response, etc.) retain the header without relying on interceptors. Story **1.4** still owns enriching JSON error bodies with **`requestId`**.

- [x] **[Review][Patch] Cap or reject oversized client `x-request-id` values** [`homeinspection-api/src/common/request-id.util.ts`]

- [x] **[Review][Patch] Restrict global interceptors + `getRequestIdFromExecutionContext` to HTTP contexts** [`homeinspection-api/src/common/interceptors/logging.interceptor.ts`, `request-id.interceptor.ts`, `request-context.ts`]

- [x] **[Review][Patch] E2E: assert `X-Request-Id` on a non-2xx response** (e.g. **404** unknown route) [`homeinspection-api/test/app.e2e-spec.ts`]

- [x] **[Review][Defer] `LoggingInterceptor` logs `originalUrl` (may include query strings)** [`homeinspection-api/src/common/interceptors/logging.interceptor.ts`] — deferred, pre-existing hygiene until structured logging/redaction.

## Dev Notes

### Architecture compliance (must follow)

- **Folder layout:** Cross-cutting HTTP concerns live under **`src/common/`** — **`middleware/`**, **`interceptors/`** per Architecture tree (`request-id.interceptor.ts`, `logging.interceptor.ts`). [Source: `_bmad-output/planning-artifacts/architecture.md` — “Complete project directory structure”]

- **Logging shape:** Architecture calls for structured logs with **`requestId`** among fields; use the minimum viable approach in this story (Nest `Logger`), knowing later stories may upgrade to full JSON logging. [Source: `architecture.md` — “Logging patterns”]

- **API custom headers:** Prefer conventional names; **`X-Request-Id`** is widely supported for correlation despite the general “avoid `X-`” note—**document** the chosen header in README. [Source: `architecture.md` — “API naming conventions” / Custom headers bullet]

- **Error envelope:** Stable JSON `{ "error": { "code", "message", "details?", "requestId" } }` is **Story 1.4**; do **not** implement the full envelope here—only **propagate** id for future injection. [Source: `architecture.md` — “Format Patterns”]

### Epic / PRD traceability

- **FR6** — Request correlation ID on all requests. [Source: `_bmad-output/planning-artifacts/epics.md` — FR list; Story 1.3 section]

- **Story ordering:** Sprint notes suggest completing **1.6 before 1.5** for route/auth alignment—**unchanged** by this story; correlation id should work for **all** routes including future **`/v1/...`**.

### Boundary with Story 1.4 (global exception filter)

- **1.3** owns **generating/storing/echoing** the id and **logging** it.  
- **1.4** owns mapping exceptions to the **public JSON error schema** including **`error.requestId`**.  
- **Contract:** Expose **`requestId`** on the request (or request-scoped service) so **`HttpExceptionFilter`** in 1.4 reads **`getRequestId(context)`** without creating a second id.

### Library / framework requirements

- **No new dependencies** required if you use **`crypto.randomUUID()`** (Node **20.18+** per engines). If you choose **`uuid`** package instead, record the reason in Dev Agent Record and update **`package.json`** / lockfile.

- Do **not** add **`@nestjs/swagger`**, PDF tooling, or DB drivers in this story.

### Previous story intelligence (1.2)

- Boot requires validated env; **`test/jest-e2e.setup.ts`** sets **`AUTH_MODE`**, mock headers, **`NODE_ENV=test`** — keep e2e green.  
- **`ConfigModule`** is **global**; new interceptors/middleware must not import config in a way that breaks **`npm run test`** (unit tests that instantiate `AppModule` need the same env or mocks).

### Git intelligence

- Recent commits: Story **1.1** scaffold (`e630c15`), Story **1.2** config (`46f7e99` / follow-on). Patterns: small focused commits under `homeinspection-api/`, root README updates for operator UX.

### Latest technical specifics (May 2026)

- **NestJS 11** + **Express** (default platform): global middleware order is **`middleware → guards → interceptors → route handler`**. Ensure request id exists **before** interceptors that log.  
- **`crypto.randomUUID()`** is stable in Node 20 LTS; avoid `Math.random()` for ids.

### Project structure notes

- New files expected primarily under **`homeinspection-api/src/common/`** and optionally **`homeinspection-api/src/types/`**.  
- **UPDATE** surfaces: **`main.ts`**, **`app.module.ts`** (if using `MiddlewareConsumer`).

### References (read order for implementer)

1. `_bmad-output/planning-artifacts/architecture.md` — project tree (`common/interceptors`, logging fields).  
2. `_bmad-output/planning-artifacts/epics.md` — Epic 1, Story 1.3; glance **Story 1.4** for filter responsibilities.  
3. `_bmad-output/project-context.md` — correlation / queue context rules where relevant.  
4. `_bmad-output/implementation-artifacts/1-2-environment-configuration-module-and-env-example.md` — config + e2e setup constraints.

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

### Completion Notes List

- **AC4 approach:** Documented hand-off for Story **1.4** in Completion Notes and **`homeinspection-api/README.md`**. Automated verification uses e2e assertions on **`X-Request-Id`** (no separate `HttpException` smoke in this pass).
- **`MiddlewareConsumer` in `AppModule`:** Runs **`RequestIdMiddleware`** for all routes before interceptors; keeps **`main.ts`** unchanged and stays idiomatic for Nest feature modules.
- **Global interceptors:** **`CommonModule`** registers **`APP_INTERCEPTOR`** providers for **`RequestIdInterceptor`** (sets **`X-Request-Id`**) and **`LoggingInterceptor`** (Nest **`Logger`** with **`[requestId=…]`** prefix).
- **Story 1.4 contract:** HTTP code should call **`getRequestIdFromExecutionContext(context)`** or read **`req.requestId`** so **`error.requestId`** matches logs and the response header.
- **Code review follow-up:** **`REQUEST_ID_MAX_LENGTH`** (128), HTTP **`getType()`** guards, oversized header falls back to UUID, e2e 404 **`X-Request-Id`**, middleware **`res.setHeader`** for paths without interceptors.

### File List

- `homeinspection-api/src/types/express.d.ts`
- `homeinspection-api/src/common/request-id.util.ts`
- `homeinspection-api/src/common/request-id.util.spec.ts`
- `homeinspection-api/src/common/middleware/request-id.middleware.ts`
- `homeinspection-api/src/common/interceptors/request-id.interceptor.ts`
- `homeinspection-api/src/common/interceptors/logging.interceptor.ts`
- `homeinspection-api/src/common/request-context.ts`
- `homeinspection-api/src/common/request-context.spec.ts`
- `homeinspection-api/src/common/common.module.ts`
- `homeinspection-api/src/app.module.ts`
- `homeinspection-api/test/app.e2e-spec.ts`
- `homeinspection-api/README.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

---

## Change Log

- **2026-05-04:** Story created — `bmad-create-story` auto-discovered backlog **1.3**; status **ready-for-dev**.
- **2026-05-04:** Implemented correlation id middleware, global interceptors, tests, and README; **`npm run lint`**, **`build`**, **`test`**, **`test:e2e`** green; status **review**.
- **2026-05-04:** Applied code-review patches: max client id length (128), HTTP-only checks in interceptors + **`getRequestIdFromExecutionContext`**, 404 e2e, middleware sets **`X-Request-Id`** for non-interceptor paths; all review checkboxes closed; status **review**.
- **2026-05-04:** Story accepted complete; status **done**.

---

**Story context:** Ultimate BMad create-story pass — Story **1.3** only; defer **full** global exception JSON envelope to **1.4**, auth guard to **1.6**, rate limit to **1.7**, versioned upload route shell to **1.5** where not needed for correlation wiring.
