# Story 4.1: Web client scaffold and API integration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a prototype maintainer,  
I want a dedicated Phase 2 web package with toolchain, environment-based API base URL, and authenticated multipart upload to `POST /v1/report/upload`,  
So that UI stories build on a consistent integration boundary without modifying `homeinspection-api` behavior.

## Acceptance Criteria

1. **AC1 — Package location and toolchain**  
   **Given** the repo currently contains only `homeinspection-api` as a Node package,  
   **When** the implementation is complete,  
   **Then** a sibling package exists at **`homeinspection-web/`** (repo root) with its own `package.json`, TypeScript, and a dev server (recommended: **Vite + React + TypeScript**).  
   **And** `npm install` and `npm run dev` (or equivalent documented scripts) start the client without requiring global CLI tools beyond Node/npm.

2. **AC2 — Environment-configured API and auth**  
   **Given** the API uses `ApiKeyGuard` with `AUTH_MODE=mock` or `live`,  
   **When** a developer copies `.env.example` to `.env` in `homeinspection-web/`,  
   **Then** documented variables control at least:  
   - **`VITE_API_BASE_URL`** — origin only (e.g. `http://localhost:3000`), **no** trailing slash requirement documented explicitly.  
   - **`VITE_AUTH_MODE`** — `mock` | `live` (must mirror API behavior the developer is targeting).  
   - **`VITE_MOCK_AUTH_HEADER_NAME`** and **`VITE_MOCK_AUTH_HEADER_VALUE`** — used when `VITE_AUTH_MODE=mock`; values must match the API’s `MOCK_AUTH_HEADER_NAME` / `MOCK_AUTH_HEADER_VALUE` (see `homeinspection-api/.env.example`).  
   - **`VITE_API_KEY`** — used when `VITE_AUTH_MODE=live`: send as **`Authorization: Bearer <key>`** *or* **`x-api-key`** consistent with [`homeinspection-api/src/common/guards/api-key.guard.ts`](../../homeinspection-api/src/common/guards/api-key.guard.ts) (document which one the client implements; either is valid server-side).

3. **AC3 — Multipart upload contract**  
   **Given** [`homeinspection-api/src/modules/report/report.controller.ts`](../../homeinspection-api/src/modules/report/report.controller.ts) defines `FileInterceptor('file', …)`,  
   **When** the client uploads a PDF,  
   **Then** the request is **`POST ${base}/v1/report/upload`** with **`multipart/form-data`** and a single file field named **`file`**.  
   **And** the correct auth header(s) are attached on every request (mock header **name/value** must match API config; header names are case-insensitive per HTTP but use **`x-mock-auth`** by default per [`MOCK_AUTH_HEADER_NAME`](../../homeinspection-api/src/openapi/upload.openapi.ts) constant alignment).

4. **AC4 — Success path demonstration**  
   **Given** a valid small PDF and a running API,  
   **When** the user completes an upload through the scaffold UI,  
   **Then** the HTTP **200** JSON body is shown verbatim (e.g. formatted `<pre>` or JSON viewer) **or** the app navigates to a minimal **results** route that renders the same raw JSON (Story 4.5 will replace with real observation UI).

5. **AC5 — No unsolicited API changes**  
   **Given** this story establishes the browser integration boundary,  
   **When** changes are merged,  
   **Then** **`homeinspection-api`** behavior, routes, and dependencies are **unchanged**, except **optional** CORS enablement **if** the team chooses direct cross-origin calls instead of a dev proxy (see Dev Notes). Any CORS change must be env-gated and documented.

6. **AC6 — Cross-origin developer experience**  
   **Given** Vite typically serves on port **5173** and API on **3000**,  
   **When** a developer follows `homeinspection-web/README.md`,  
   **Then** they have **either**:  
   - **Recommended:** Vite **`server.proxy`** routing `/v1` → API origin so the browser stays same-origin in dev **without** Nest CORS; **`VITE_API_BASE_URL`** documents production vs dev, **or**  
   - **Alternative:** documented Nest `enableCors()` (or equivalent) behind **`CORS_ORIGIN`** (or similar) env flag with explicit allowed origin for local Vite.

## Tasks / Subtasks

- [x] **T1 — Scaffold `homeinspection-web/`** (AC: 1)  
  - [x] Add `package.json` with React + Vite + TypeScript; scripts: `dev`, `build`, `preview`, `lint` (eslint flat config optional but preferred).  
  - [x] Pin Node requirement in `engines` consistent with [`README.MD`](../../README.MD) guidance (same LTS band as API).

- [x] **T2 — Environment contract** (AC: 2)  
  - [x] Add `homeinspection-web/.env.example` listing all `VITE_*` variables with comments referencing API `.env.example`.  
  - [x] Add small runtime helper (e.g. `src/config.ts`) that reads `import.meta.env` and fails fast in dev with clear messages if mock/live variables are inconsistent.

- [x] **T3 — API client module** (AC: 3, 4)  
  - [x] Implement `uploadReportPdf(file: File): Promise<unknown>` using `fetch`, `FormData`, and `append('file', file)`.  
  - [x] Build URL as ``${normalizeBase(VITE_API_BASE_URL)}/v1/report/upload``.  
  - [x] Attach auth headers per mode (mock vs live).

- [x] **T4 — Minimal UI** (AC: 4)  
  - [x] Default view: file input + submit; on success store JSON in state and show raw body **or** `react-router` navigate to `/results` displaying JSON.  
  - [x] On non-2xx, surface status + body text for debugging (structured error UI is Story 4.4).

- [x] **T5 — Documentation** (AC: 5, 6)  
  - [x] `homeinspection-web/README.md`: prerequisites, env vars, mock vs live, proxy-vs-CORS decision, how to run API + web together, sample curl parity for multipart field `file`.

- [x] **T6 — Verification** (AC: 3–5)  
  - [x] Manual E2E: run API (`AUTH_MODE=mock`) + web; upload a **real** PDF that parses under production `pdf-parse` (not repo e2e stubs — see [`homeinspection-api/test/fixtures/README.md`](../../homeinspection-api/test/fixtures/README.md)). Automated: `npm run build`, `lint`, `vitest`.  
  - [x] Confirm **no** unintended edits under `homeinspection-api/` (unless optional CORS behind env).

### Review Findings

- [x] [Review][Patch] T6 / verification note still recommends `valid-upload.pdf` for manual success-path testing; repo fixtures do not parse under production `pdf-parse` — align story text with [`homeinspection-web/README.md`](../../homeinspection-web/README.md) and [`homeinspection-api/test/fixtures/README.md`](../../homeinspection-api/test/fixtures/README.md). [`4-1-web-client-scaffold-and-api-integration.md`:76]
- [x] [Review][Patch] Document that **`server.proxy` applies to `npm run dev` only**: with empty `VITE_API_BASE_URL`, `vite preview` or static hosting posts `/v1` to the preview/static origin unless developers set `VITE_API_BASE_URL` (and CORS) or an edge route — avoids silent confusion after `npm run build`. [`homeinspection-web/README.md`]

## Dev Notes

### Epic / backlog context

- **Epic 4** delivers first-party homeowner UI; **4.1** only establishes integration and scaffold.  
- Phase 1 / Phase 2 boundary: [`docs/ux-backlog.md`](../../docs/ux-backlog.md). Do **not** imply new API fields or endpoints.

### API facts (do not guess)

| Topic | Source |
|--------|--------|
| Route | `POST /v1/report/upload` — [`report.controller.ts`](../../homeinspection-api/src/modules/report/report.controller.ts) `@Controller('v1/report')` + `@Post('upload')` |
| Multipart field | **`file`** — `FileInterceptor('file', …)` |
| Success shape | `pageCount`, `sections[]` with `sectionName`, `observations[].text` — OpenAPI example [`upload.openapi.ts`](../../homeinspection-api/src/openapi/upload.openapi.ts) `uploadOpenApiExamples.success` |
| Error shape | `{ error: { code, message, requestId, details? } }` — same file `uploadErrorSchema` |
| Mock auth header constant | `MOCK_AUTH_HEADER_NAME` = `'x-mock-auth'` in [`upload.openapi.ts`](../../homeinspection-api/src/openapi/upload.openapi.ts); actual **required** name/value at runtime come from API env (`MOCK_AUTH_HEADER_*`). |
| Live auth | `Authorization: Bearer <key>` **or** `x-api-key` — [`api-key.guard.ts`](../../homeinspection-api/src/common/guards/api-key.guard.ts) |

### Architecture compliance

- Architecture marks frontend as deferred until Phase 2; **this story selects** Vite + React + TS as an explicit implementation choice for Epic 4 (aligned with UX spec Phase 2+ primitives roadmap — Tailwind/Radix can land in **4.2**).  
- Do **not** add AWS SDK, Nest, or PDF parsing to the web package.

### CORS vs proxy (mandatory clarity)

- **`setupApp` in [`app.setup.ts`](../../homeinspection-api/src/app.setup.ts)** does not enable CORS today. Browser cross-origin `fetch` to `:3000` from `:5173` **will fail** without one of: proxied same-origin requests, or Nest `enableCors`.  
- **Prefer Vite proxy** for dev so AC5 stays satisfied with zero API diff.

### Testing requirements

- Unit test optional: mock `fetch` for `FormData` construction / URL builder (Vitest).  
- No requirement to add Playwright in this story; manual checklist in README is sufficient.

### Previous epic intelligence

- **Story 3.1** [`3-1-ux-spec-traceability-backlog-for-deferred-ui.md`](./3-1-ux-spec-traceability-backlog-for-deferred-ui.md): cross-repo markdown links must use correct relative paths from `docs/` vs `_bmad-output/`; web README links should use repo-root-relative paths where helpful.

### Library / stack guardrails

- **Vite** + **React 18+** + **TypeScript** (`"strict": true` in `tsconfig`).  
- Avoid heavyweight meta-frameworks (Next.js app router, etc.) for this story—keep SPA simple until routing needs grow.

### Project context reference

- Respect [`_bmad-output/project-context.md`](../../project-context.md): env-driven config, no silent API contract drift; UI consumes **`v1`** as documented.

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

- Sprint auto-discovery: first `backlog` story under Epic 4 → **4-1-web-client-scaffold-and-api-integration**.

### Completion Notes List

- Added `homeinspection-web/` (Vite 6 + React 19 + TS strict): proxy `/v1` → `VITE_PROXY_TARGET`, empty `VITE_API_BASE_URL` in dev for same-origin uploads.
- Client sends multipart field `file`; mock auth uses configurable header name/value; live uses `Authorization: Bearer`.
- `uploadEndpoint` + auth helpers covered by Vitest; production path `npm run build` + ESLint clean.
- No `homeinspection-api` code changes (CORS not required with proxy).
- Code review patches: T6 verification wording aligned with fixtures README; README notes dev-only proxy vs preview/production.

### File List

- `homeinspection-web/package.json`
- `homeinspection-web/package-lock.json`
- `homeinspection-web/vite.config.ts`
- `homeinspection-web/tsconfig.json`
- `homeinspection-web/tsconfig.node.json`
- `homeinspection-web/index.html`
- `homeinspection-web/eslint.config.js`
- `homeinspection-web/.gitignore`
- `homeinspection-web/.env.example`
- `homeinspection-web/README.md`
- `homeinspection-web/src/main.tsx`
- `homeinspection-web/src/index.css`
- `homeinspection-web/src/vite-env.d.ts`
- `homeinspection-web/src/config.ts`
- `homeinspection-web/src/config.spec.ts`
- `homeinspection-web/src/api/uploadReport.ts`
- `homeinspection-web/src/pages/UploadPage.tsx`
- `homeinspection-web/src/pages/ResultsPage.tsx`
- `README.MD` (root — link to web package)

---

## Change Log

- **2026-05-06:** Story created via `bmad-create-story` from `epics.md` Epic 4 / Story 4.1 + API source verification.
- **2026-05-06:** Implemented `homeinspection-web` scaffold and integration; status `ready-for-dev` → `review`.
- **2026-05-06:** Code review patches applied (T6/fixtures wording; preview/production API base URL); status `review` → `done`.
