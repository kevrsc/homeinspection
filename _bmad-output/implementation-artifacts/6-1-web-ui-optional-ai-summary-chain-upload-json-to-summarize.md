# Story 6.1: Web UI — optional AI summary (chain upload JSON to summarize)

Status: done

<!-- Ultimate context engine analysis completed — comprehensive developer guide created -->

## Story

As a homeowner using the web client,  
I want an **optional control** (after a successful PDF upload) to **request an AI summary**,  
So that the app calls **`POST /v1/report/summarize`** with the **upload response JSON** and shows **`ObservationSummary`**-shaped results (or structured errors) without leaving the core flow.

## Acceptance Criteria

1. **Given** **`ResultsPage`** has a **valid** upload success payload (`parseUploadSuccess` → **`ok: true`**),  
   **When** the user activates the new summarize action,  
   **Then** the client sends **`POST /v1/report/summarize`** with **`Content-Type: application/json`**, the **same auth headers** as upload (**`buildAuthHeaders`** pattern: mock header name/value or **`Authorization: Bearer`**), and a JSON body that satisfies the **`/v1/report/summarize`** request schema in [`homeinspection-api/openapi/openapi.json`](../../homeinspection-api/openapi/openapi.json) (**`pageCount`** + **`sections[]`** required).

2. **And** on **HTTP 200**, the UI renders **`executiveSummary`** and **`prioritizedItems[]`** ( **`rank`**, **`title`**, **`rationale`**) in a **new or extended** results component, using **Direction 1** typography/spacing tokens consistent with [`ObservationResults`](../../homeinspection-web/src/features/results/ObservationResults.tsx).

3. **And** on failure, the UI reuses the **structured error envelope** path: **`parseUploadFailure`** + **`UploadErrorPanel`** (same `error.code` / `message` / `requestId` / `details` shape as upload and summarize APIs) so **UX-DR5** behavior stays coherent.

4. **And** the summarize request shows **honest progress** (e.g. disabled button + visible status text, **`aria-live`** where appropriate) and does **not** claim a tighter SLA than **NFR1** (~30s prototype expectation) unless copy is explicitly hedged—mirror the tone patterns from [`UploadProcessingStatus`](../../homeinspection-web/src/features/upload/UploadProcessingStatus.tsx) / Epic **4.3**.

5. **And** users who **never** click summarize see **no** new UI chrome beyond what exists today (optional path only).

6. **And** **`homeinspection-web/README.md`** documents **`POST /v1/report/summarize`** (correct path: singular **`report`**, not **`reports`**), **JSON** body (not multipart PDF), and env/proxy behavior consistent with upload.

7. **And** **`npm run test`**, **`npm run lint`**, and **`npm run build`** pass from **`homeinspection-web/`**.

## Tasks / Subtasks

- [x] **Config + URL builder** (AC: #1, #6)  
  - [x] Add **`summarizeEndpoint(base: string): string`** returning **`/v1/report/summarize`** (same **`normalizeApiBase`** / join rules as [`uploadEndpoint`](../../homeinspection-web/src/config.ts)).  
  - [x] Extend [`config.spec.ts`](../../homeinspection-web/src/config.spec.ts) with parallel expectations for **`summarizeEndpoint`**.

- [x] **API client — JSON POST** (AC: #1–#3)  
  - [x] Implement **`summarizeObservationsPayload(payload: UploadSuccessPayload, apiBaseUrl, auth)`** (name flexible) in a new module e.g. [`homeinspection-web/src/api/summarizeReport.ts`](../../homeinspection-web/src/api/summarizeReport.ts).  
  - [x] **Refactor auth header construction** so upload and summarize share one implementation: **export** **`buildAuthHeaders`** / **`UploadAuthHeaders`** from [`uploadReport.ts`](../../homeinspection-web/src/api/uploadReport.ts) **or** move both to **`src/api/authHeaders.ts`**—avoid duplicating mock vs live logic.  
  - [x] Serialize body with **`JSON.stringify`**: ensure **`pageCount`** is always a **finite integer** ≥ **0** (use **`payload.pageCount`** when present; otherwise **`0`** or a documented deterministic default—must match API validator in [`summarize-request.validation.ts`](../../homeinspection-api/src/modules/report/dto/summarize-request.validation.ts)).  
  - [x] Mirror **`uploadReportPdf`** response handling: **`response.text()`** → parse JSON, attach **`status`** + **`body`** on thrown errors for **`parseUploadFailure`**.

- [x] **Results UI** (AC: #1–#5, #7)  
  - [x] On **`ResultsPage`** (or a child hook/component), add a **primary-style button** (or equivalent control) **below** disclaimer / observations when **`parsed.ok`**, e.g. **“Get AI summary”**.  
  - [x] Wire **`readWebConfig()`** once (pattern from [`UploadPage`](../../homeinspection-web/src/pages/UploadPage.tsx)): avoid throwing during render—use **`useState(() => readWebConfig())`** or lazy init consistent with upload.  
  - [x] Track **`idle` | `loading` | `success` | `error`** (or similar); disable the button while **`loading`**; show **`UploadErrorPanel`** on structured failure.  
  - [x] On success, render summary block: **`executiveSummary`** as prose; **`prioritizedItems`** as ordered list (**`rank`**, **`title`**, **`rationale`**). Add lightweight runtime validation (optional **`parseObservationSummary`** in `features/results/` if it keeps **`ResultsPage`** thin).  
  - [x] Add **`aria-live="polite"`** (or reuse existing results live-region patterns) for completion/failure announcements if you add new status strings—avoid duplicate **`role="status"`** regions fighting each other (see [`design-foundations.md`](../../homeinspection-web/docs/design-foundations.md) / Story **4.4** a11y notes).

- [x] **Tests** (AC: #7)  
  - [x] Unit-test **`summarizeEndpoint`** (config).  
  - [x] Unit-test **`summarizeObservationsPayload`** with **`fetch` mocked** (`globalThis.fetch`): assert URL, method, headers, JSON body include **`pageCount`**; assert success parses **`ObservationSummary`** shape; assert **`!ok`** path throws with **`status`** for parser.  
  - [x] Component test or RTL test on **`ResultsPage`** for button visibility when **`parseUploadSuccess`** succeeds (optional but preferred if fast).

- [x] **Docs** (AC: #6)  
  - [x] Update [`homeinspection-web/README.md`](../../homeinspection-web/README.md): summarize route, JSON contract pointer to OpenAPI, note **two-step** flow (PDF upload → JSON summarize).

## Dev Notes

### Scope boundaries (critical)

| In scope | Out of scope (Story **6.2**) |
|----------|-------------------------------|
| **Client** `POST` **JSON** to **`/v1/report/summarize`** | Multipart **PDF** directly to summarize |
| **Optional** UX on **`ResultsPage`** | Changing **`POST /v1/report/upload`** contract |
| **Reuse** auth + error panel patterns | New Epic **6** retrospective (separate workflow) |

### Contract truth (do not drift)

- **Path:** **`POST /v1/report/summarize`** — singular **`report`**.  
- **Request body:** Same shape as upload **200** — see OpenAPI **`paths['/v1/report/summarize'].post.requestBody`**.  
- **Success body:** **`#/components/schemas/ObservationSummary`** — `executiveSummary` + `prioritizedItems[]`.  
- **Proxy:** Vite [`vite.config.ts`](../../homeinspection-web/vite.config.ts) already proxies **`/v1`** → **`VITE_PROXY_TARGET`**; no change required unless you discover a gap.

### Current code map (must read before editing)

| File | Role today |
|------|------------|
| [`UploadPage.tsx`](../../homeinspection-web/src/pages/UploadPage.tsx) | **`uploadReportPdf`** → **`navigate('/results', { state: { json } })`** |
| [`ResultsPage.tsx`](../../homeinspection-web/src/pages/ResultsPage.tsx) | Reads **`location.state.json`**, **`parseUploadSuccess`**, renders list |
| [`uploadReport.ts`](../../homeinspection-web/src/api/uploadReport.ts) | Multipart upload + auth + error throw shape |
| [`parseUploadFailure.ts`](../../homeinspection-web/src/features/upload/parseUploadFailure.ts) | Generic structured envelope parser |
| [`uploadSuccessModel.ts`](../../homeinspection-web/src/features/results/uploadSuccessModel.ts) | **`UploadSuccessPayload`** — note **`pageCount`** optional in type but **API requires it** for summarize; **always send integer**. |

### Architecture compliance

- Keep **`readWebConfig`** fail-fast rules unchanged.  
- No **`any`** for API JSON—prefer **`unknown`** + narrow parsers or typed interfaces aligned with OpenAPI.  
- Do not log full observation payloads to **`console`** at info level in production paths.

### Library / versions

- Follow existing **`homeinspection-web/package.json`** (**React Router**, **Vite**, **Vitest**, **Testing Library** if already present).

## Project Structure Notes

- New API helper lives under **`homeinspection-web/src/api/`**.  
- Summary presentation may live under **`homeinspection-web/src/features/results/`** next to **`ObservationResults`**.

### References

- Epic text: [`epics.md`](../planning-artifacts/epics.md) — Epic **6**, Story **6.1**  
- OpenAPI: [`homeinspection-api/openapi/openapi.json`](../../homeinspection-api/openapi/openapi.json)  
- Prior UI stories: [`4-5-observation-list-and-section-grouping-direction-1-baseline.md`](./4-5-observation-list-and-section-grouping-direction-1-baseline.md), [`4-4-structured-error-panel-with-copy-request-id-and-live-regions.md`](./4-4-structured-error-panel-with-copy-request-id-and-live-regions.md) (if present)  
- Project rules: [`project-context.md`](../project-context.md)

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

### Completion Notes List

- Implemented `summarizeEndpoint`, shared `buildAuthHeaders` / `UploadAuthHeaders` in `src/api/authHeaders.ts`, `summarizeObservationsPayload` + `buildSummarizeRequestBody` in `summarizeReport.ts`, runtime `parseObservationSummary` in `observationSummaryModel.ts`, and `AiSummarySection` on `ResultsPage` with `UploadErrorPanel` variant `summarize`, sr-only `aria-live` announcements, and optional `flavor: 'summary'` for failure announcements. README documents two-step JSON summarize + proxy. `npm run test`, `lint`, and `build` pass.
- Epic **6** marked **done** in sprint tracking (**2026-05-11**); **6.2** stays **backlog** per epic scope. Retrospective: `epic-6-retro-2026-05-11.md`.

### Implementation Plan

- Red–green: config + API client tests first; then UI wiring; RTL `ResultsPage` smoke; a11y mock extended with `summarizeEndpoint`.

### File List

- `homeinspection-web/src/api/authHeaders.ts`
- `homeinspection-web/src/api/summarizeReport.ts`
- `homeinspection-web/src/api/summarizeReport.spec.ts`
- `homeinspection-web/src/api/uploadReport.ts`
- `homeinspection-web/src/config.ts`
- `homeinspection-web/src/config.spec.ts`
- `homeinspection-web/src/features/results/AiSummarySection.tsx`
- `homeinspection-web/src/features/results/observationSummaryModel.ts`
- `homeinspection-web/src/features/upload/parseUploadFailure.ts`
- `homeinspection-web/src/features/upload/UploadErrorPanel.tsx`
- `homeinspection-web/src/pages/ResultsPage.tsx`
- `homeinspection-web/src/pages/ResultsPage.spec.tsx`
- `homeinspection-web/src/a11y/coreFlows.a11y.spec.tsx`
- `homeinspection-web/README.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/6-1-web-ui-optional-ai-summary-chain-upload-json-to-summarize.md`
- `_bmad-output/implementation-artifacts/epic-6-retro-2026-05-11.md`

## Git intelligence (recent patterns)

- **`0e56c48`** — Mock **`AI_SUMMARIZER`** e2e; **`parseAndValidateSummarizeBody`** assertion pattern for contract fidelity.  
- **`0aa6ed3`** — Summarize route + OpenAPI + filter codes—client should mirror documented **`error.code`** / **`details.code`** pairs.

## Change Log

- **2026-05-10:** Story file created (`ready-for-dev`) from sprint backlog auto-discovery (Epic **6**).
- **2026-05-10:** Implementation complete — optional summarize chain, tests, README; status `review`.
- **2026-05-11:** Verified end-to-end with LLM; Epic **6** closed; story status `done`.
