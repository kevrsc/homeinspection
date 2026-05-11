# Story 4.4: Structured error panel with copy Request ID and live regions

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a homeowner hitting validation, extraction, auth, or rate-limit failures,  
I want action-first messaging mapped from API `code` and `message`, a visible `requestId`, and an easy copy affordance,  
So that I can recover or share diagnostics (UX-DR5, UX-DR8 partial).

## Acceptance Criteria

1. **AC1 — Structured envelope parsing**  
   **Given** [`uploadReportPdf`](../../homeinspection-web/src/api/uploadReport.ts) throws with **`status`** and **`body`** when `!response.ok`,  
   **When** `body` parses as the Phase 1 JSON error envelope (`error.code`, `error.message`, `error.requestId`, optional `error.details`) per [`failure-matrix.md`](../../homeinspection-api/docs/api/failure-matrix.md) and [`openapi/openapi.json`](../../homeinspection-api/openapi/openapi.json),  
   **Then** the UI derives **`code`**, **`message`**, and **`requestId`** for display without brittle string parsing of `Error.message`.  
   **When** `body` is non-JSON, malformed, or missing `error.*`,  
   **Then** the UI still shows an accessible fallback (**HTTP status** + generic recovery guidance + optional truncated raw snippet — avoid dumping unlimited opaque text into the live region).

2. **AC2 — Action-first panel**  
   **Given** a mapped failure,  
   **When** the upload route renders the server error,  
   **Then** the panel leads with **what to do next** — primary content is API **`message`** (human-readable); surface **`code`** visibly as secondary metadata (not icon-only).  
   **And** layout uses Direction 1 calm chrome (`border-border`, `bg-surface`, `text-fg` / `text-fg-muted`) consistent with Story **4.2–4.3**.

3. **AC3 — Request ID: visible + copy**  
   **Given** `requestId` is present in the envelope,  
   **When** the panel renders,  
   **Then** `requestId` appears as **readable plain text** (never QR/icon-only).  
   **And** a **Copy request ID** control uses **`navigator.clipboard.writeText`** when available with a documented fallback (e.g. **`execCommand('copy')`** from a temporary textarea or **manual select**) for constrained contexts.  
   **And** the control has an **`aria-label`** (and optional **`sr-only`** helper text) so screen readers announce purpose and outcome (**success / failure** toast or **`aria-live`** polite confirmation).

4. **AC4 — Polite live region**  
   **Given** the failure arrives **after** async `fetch` resolves (relative to the submitting interaction),  
   **When** server error state is committed to React state,  
   **Then** a **`polite`** live region announces a **concise** summary (e.g. failure + code + presence of request id) **without** moving keyboard focus into the panel automatically — [**UX-DR5**](../../docs/ux-backlog.md) / [**UX spec**](../planning-artifacts/ux-design-specification.md) alignment (no inappropriate focus steal).  
   **And** distinguish this region from Story **4.3** processing status (`UploadProcessingStatus`) so announcements do not collide confusingly.

5. **AC5 — Scope**  
   **Given** Story **4.5** replaces results rendering,  
   **When** this story completes,  
   **Then** structured upload failures are handled on **`UploadPage`** — **`ResultsPage`** unchanged unless a trivial shared type/helper extraction avoids duplication **without** expanding scope to full results error UX.

6. **AC6 — Verification**  
   **When** `npm run lint`, `npm run build`, `npm run test` run in **`homeinspection-web/`**,  
   **Then** they **pass**, including **Vitest** coverage for the **`body` → model** parser / type guard with representative fixture shapes from [`homeinspection-api/test/fixtures/json/upload-error-*.json`](../../homeinspection-api/test/fixtures/json/).

## Tasks / Subtasks

- [ ] **T1 — Error model + parser** (AC: 1, 6)  
  - [ ] Add pure **`parseUploadFailure(body: unknown, httpStatus: number)`** (name adjustable) returning a discriminated union: **`structured`** (`code`, `message`, `requestId?`, `details?`) vs **`fallback`** (`httpStatus`, `detailText?`).  
  - [ ] Implement **`isStructuredErrorEnvelope`** style guard matching runtime/OpenAPI (`error` object with string `code` + `message`).  
  - [ ] Vitest table-driven tests importing or inlining minimal fragments aligned with **`upload-error-validation-type.json`**, **`upload-error-auth.json`**, **`upload-error-timeout.json`**, plus malformed `{}` and non-object JSON.

- [ ] **T2 — `UploadErrorPanel` component** (AC: 2, 3)  
  - [ ] Present **heading + primary message + code row + requestId row**; optional **`details`** JSON sub-block collapsed under `<details>` if useful for prototype maintainers — **do not** let raw JSON dominate the panel.  
  - [ ] **Copy** button wired with async handler; expose **`aria-live="polite"`** stub text element for “Copied” / “Copy failed” feedback **or** temporary `role="status"` region updates.

- [ ] **T3 — Live region wiring** (AC: 4)  
  - [ ] Dedicated **`aria-live="polite"`** container updated via **`useEffect`** when server failure model changes (announce once per new failure).  
  - [ ] Keep announcement **short** (≤ ~300 chars); full detail stays in the visible panel.

- [ ] **T4 — Integrate `UploadPage`** (AC: 1–5)  
  - [ ] Replace legacy **`debugError`** `<pre>` block with **`UploadErrorPanel`** + parser output; clear server error when user picks a new file or on successful retry path.  
  - [ ] Preserve **client-side** validation **`role="alert"`** from Story **4.3** — server vs client errors must not overwrite each other ambiguously (define precedence in Dev Notes).

- [ ] **T5 — Documentation** (AC: 2)  
  - [ ] Add bullet to **`homeinspection-web/README.md`** or **`docs/design-foundations.md`** linking UX-DR5 + failure-matrix + error envelope keys.

- [ ] **T6 — Regression** (AC: 6)  
  - [ ] Full **`npm run test` / lint / build** green.

## Dev Notes

### Epic / backlog

- Maps **Epic 4 / Story 4.4** ([`epics.md`](../planning-artifacts/epics.md)), [**UX-DR5**](../../docs/ux-backlog.md), partial **UX-DR8** (live region / SR exposure).

### Previous story (4.3)

- [`UploadPage.tsx`](../../homeinspection-web/src/pages/UploadPage.tsx): **`uploadReportPdf`** catch sets **`debugError`** string today — **replace** with typed failure handling + panel.  
- **`UploadProcessingStatus`**: still shown while **`busy`**; errors render **after** **`busy`** false — sequencing must avoid duplicate live chatter.

### Architecture / API contract

- **No `homeinspection-api` changes.** Envelope is stable per [`failure-matrix.md`](../../homeinspection-api/docs/api/failure-matrix.md): `error.code`, `error.message`, `error.requestId`, optional `error.details`.  
- **`requestId`** mirrors **`X-Request-Id`** semantics but UI consumes JSON body per AC.

### UX specification excerpts

- [**Feedback / errors**](../planning-artifacts/ux-design-specification.md): action-first copy; **`requestId`** always surfaced for server failures; distinguish retryable vs fix-input where feasible (**optional** enhancement via `details.code` mapping — matrix column **Client handling guidance**).

### File structure (suggested)

- `homeinspection-web/src/features/upload/parseUploadFailure.ts` (+ `.spec.ts`)  
- `homeinspection-web/src/features/upload/UploadErrorPanel.tsx`  
- `homeinspection-web/src/pages/UploadPage.tsx` — integration only

### Testing notes

- Clipboard APIs may be **unavailable** in Vitest — **mock** `navigator.clipboard` or test parser/component rendering separately from copy handler success path.

### References

| Topic | Source |
|-------|--------|
| Story AC source | [`epics.md` Story 4.4](../planning-artifacts/epics.md) |
| UX-DR5 | [`docs/ux-backlog.md`](../../docs/ux-backlog.md) |
| Error fixtures | [`homeinspection-api/test/fixtures/json/`](../../homeinspection-api/test/fixtures/json/) |
| Failure matrix | [`failure-matrix.md`](../../homeinspection-api/docs/api/failure-matrix.md) |
| Upload client | [`uploadReport.ts`](../../homeinspection-web/src/api/uploadReport.ts) |

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

---

_Ultimate context engine analysis completed — comprehensive developer guide created._
