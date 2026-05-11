# Story 4.3: Upload flow with pre-flight constraints and bounded-wait messaging

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a homeowner,  
I want visible PDF-only and size constraints before I choose a file, plus clear processing feedback during upload and extraction,  
So that I understand limits and why I may be waiting (UX-DR6).

## Acceptance Criteria

1. **AC1 — Constraints visible before engagement**  
   **Given** API/OpenAPI documented limits (**PDF only**, **max 20 MB**) aligned with [`homeinspection-api/src/modules/report/report.controller.ts`](../../homeinspection-api/src/modules/report/report.controller.ts) (`limits.fileSize: 20 * 1024 * 1024`) and [`homeinspection-api/openapi/openapi.json`](../../homeinspection-api/openapi/openapi.json),  
   **When** the upload view loads,  
   **Then** the homeowner sees **plain-language** constraints (**accepted type**, **maximum size**) **above or beside** the file control **before** they interact with the picker — matching [*Upload and progress region*](../planning-artifacts/ux-design-specification.md) / [*Form Patterns*](../planning-artifacts/ux-design-specification.md) intent (constraints-before-picker per UX-DR6 in [`docs/ux-backlog.md`](../../docs/ux-backlog.md)).  
   **And** copy stays truthful (no promises API does not make).

2. **AC2 — Client-side mirrors reduce wasted uploads**  
   **Given** the same limits as the server,  
   **When** the user selects a file or submits,  
   **Then** the client rejects **non-PDF** selection (MIME/extension heuristic consistent with `<input accept>` behavior — note Safari quirks in Dev Notes) and **oversized files (> 20 MB)** **before** calling [`uploadReportPdf`](../../homeinspection-web/src/api/uploadReport.ts).  
   **When** validation fails,  
   **Then** show actionable inline messaging (“Choose a PDF” / “File must be 20 MB or smaller”) **without** a network round-trip.

3. **AC3 — Bounded-wait messaging (NFR1-aligned)**  
   **Given** NFR1: responses succeed or fail within **≈30 seconds** for supported workloads ([`epics.md` FR/NFR trace](../planning-artifacts/epics.md)),  
   **When** upload/request is in-flight (`busy`),  
   **Then** show non-blocking status copy that communicates **bounded** processing (**reference ~30s as typical prototype expectation**, not a guarantee — avoid wording like “will finish in” or “always”).  
   **And** never render an empty shell during wait ([*Experience Mechanics — Loading state*](../planning-artifacts/ux-design-specification.md)).  
   **And** primary controls reflect loading (**submit disabled**, file input disabled while busy matches Story 4.1 patterns).

4. **AC4 — Reduced motion**  
   **Given** [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion),  
   **When** any progress indicator animates during busy state,  
   **Then** under **`prefers-reduced-motion: reduce`**, replace looping/high-motion visuals with **static** indicators or text-only progress — per UX spec *Motion* and UX-DR6 backlog notes.

5. **AC5 — Touch targets for upload controls**  
   **Given** mobile homeowner-first stance (**tap targets ≥ 44×44 CSS px** — [*Responsive Strategy*](../planning-artifacts/ux-design-specification.md), deferred explicitly into Stories **4.3+** from Story 4.2 notes),  
   **When** the upload affordances render at mobile widths,  
   **Then** the **Submit / Upload** control meets minimum tap target (already `min-h-11`; preserve or improve).

6. **AC6 — Scope boundaries + regressions**  
   **Given** Story **4.4** owns structured error panel / live-region polish for failures,  
   **When** this story completes,  
   **Then** **`uploadReportPdf`** contract and **`POST /v1/report/upload`** integration remain unchanged unless fixing defects explicitly scoped here — Story 4.2 **[review defer]** still applies: structured observation rendering waits for **4.5**.  
   **And** `npm run lint`, `npm run build`, `npm run test` in **`homeinspection-web/`** pass.

## Tasks / Subtasks

- [x] **T1 — Canonical limits constant** (AC: 2, 6)  
  - [x] Add shared **`MAX_UPLOAD_BYTES = 20 * 1024 * 1024`** (mirror Nest controller literal intent — cite controller OpenAPI description “max 20 MB”).  
  - [x] Optional **`ALLOWED_MIME`**/`PDF_EXTENSIONS` docstrings referencing [`upload.openapi.ts`](../../homeinspection-api/src/openapi/upload.openapi.ts) / [`failure-matrix.md`](../../homeinspection-api/docs/api/failure-matrix.md).

- [x] **T2 — Pre-flight UI** (AC: 1, 2, 5)  
  - [x] Constraint strip/helper above `<input type="file">`: PDF-only + **20 MB** ceiling + plain framing (“Inspection PDF”).  
  - [x] Wire **`accept="application/pdf,.pdf"`** (preserve Story 4.1 baseline); extend UX helper copy — **do not** hide limits behind tooltip-only patterns.

- [x] **T3 — Validation helpers + UX wiring** (AC: 2)  
  - [x] Implement **`validatePdfFile(file: File): { ok: true } | { ok: false; reason: 'type' | 'size' }`** (pure functions → Vitest-friendly).  
  - [x] On submit path **before** `uploadReportPdf`: enforce validator + map reasons to accessible messages (`role="alert"` or **`aria-live="polite"`** for correction prompts — avoid duplicating Story **4.4** structured taxonomy).

- [x] **T4 — Busy / bounded-wait region** (AC: 3, 4)  
  - [x] While **`busy`**: visible region (`aria-live="polite"` + **`aria-busy`** on relevant container) with bounded-wait copy; optional **`motion-safe:` / `motion-reduce:`** Tailwind classes or CSS `@media (prefers-reduced-motion)` wrapping spinner/indeterminate bar.  
  - [x] No fake percentages unless wired to real `xhr`/streams upload progress (**uploadReportPdf** is single **`fetch`** — favor **indeterminate** pattern).

- [x] **T5 — Docs traceability** (AC: 1)  
  - [x] Short **`README.md`** or **`homeinspection-web/docs/design-foundations.md`** bullet linking UX-DR6 + NFR1 / failure-matrix for limits wording parity — avoids drift vs Story **4.2** duplication norms ([defer ok](../../homeinspection-web/docs/design-foundations.md)).

- [x] **T6 — Tests + verification** (AC: 2, 6)  
  - [x] Vitest unit tests for `validatePdfFile` boundaries (~edge bytes **≤20 MB passes**, **`20 * 1024 * 1024 + 1` fails**, blank/non-PDF name+MIME matrix — pragmatic mocking acceptable).  
  - [x] Manual smoke: dev proxy upload unchanged (`README` “Run with API”).

## Dev Notes

### Epic context

- **Epic 4:** homeowner Journey **Upload → wait → results** ([`epics.md`](../planning-artifacts/epics.md) § Epic 4 / Story 4.3).  
- **Trace:** UX-DR6 checklist [`docs/ux-backlog.md`](../../docs/ux-backlog.md) row cites bounded waiting + **`prefers-reduced-motion`**.

### Previous story intelligence (4.2)

- Tailwind **v4** + **`@theme`** tokens (`homeinspection-web/src/index.css`); **`AppShell`** wraps routes (`layout/AppShell.tsx`).  
- **Breakpoints/theme:** [`breakpoints.ts`](../../homeinspection-web/src/theme/breakpoints.ts) — reuse semantic utilities (`text-fg`, `border-border`, `bg-page`) rather than ad hoc hex.  
- **Explicit deferrals:** WCAG deeper audits → Story **4.8**; master-detail **`lg`** → **4.7**; structured errors/live-region etiquette primarily → **4.4**.

### Architecture compliance

- **Browser-only changes** under **`homeinspection-web/`** — no `homeinspection-api` edits unless coordinated epic expands scope (out of Story **4.3**).  
- Single-shot synchronous extraction expectation [**architecture**](../planning-artifacts/architecture.md): **30s** budget aligns client-facing bounded messaging — server timeout middleware remains authoritative ([architecture § timeouts](../planning-artifacts/architecture.md)).

### UX specification MUST-follow excerpts

- **Bounded waiting / intentional-not-stuck:** [`ux-design-specification.md`](../planning-artifacts/ux-design-specification.md) — Experience Mechanics (“bounded async feel”), Loading state (“never blank screen”), Motion (**prefers-reduced-motion**).  
- **Constraints-before-picker:** Form Patterns — single file field + hints (**PDF**, **20 MB max**) client mirrors ([same doc § Components Strategy](../planning-artifacts/ux-design-specification.md)).

### Library / framework requirements

- React **19** + **`react-router-dom` v7** + Tailwind **v4** (`package.json` / Story **4.2** outcome); **`Vitest`** for validators — stay aligned with existing toolchain (**do not** add drag-drop libs unless justified).

### File structure guidance

Primary edits expected:

- [`homeinspection-web/src/pages/UploadPage.tsx`](../../homeinspection-web/src/pages/UploadPage.tsx) — orchestration  
- **NEW optional modules:** e.g. `homeinspection-web/src/features/upload/uploadLimits.ts`, `uploadPdf.validation.ts`, small **`ProcessingStatus.tsx`** — extract only if keeps **`UploadPage`** readable (~prefer cohesion unless duplication emerges).

### Testing requirements

- **Unit:** validation helpers (`*.spec.ts` beside modules mirrors **`breakpoints.spec.ts`** pattern).  
- **Not required:** Playwright/E2E in this story unless repo gains harness mid-flight — manual **`README`** smoke suffices pending QA epic tooling.

### Project context reference

[`project-context.md`](../project-context.md): env-driven configuration — browser exposes **`import.meta.env.VITE_*` only**; never bake secrets.

### Browser quirks (validation)

- **`accept`** filtering is **hint-only** on some browsers — keep **`validatePdfFile`** post-selection (AC2). **`File.type`** may be empty for uncommon paths; combine **`type`**, **`name` extension**, and optional **`arrayBuffer` sniff** for `%PDF-` only if product wants defense-in-depth (`slice(0, 5)`).

### Latest tech references (snapshot guardrails)

- **`prefers-reduced-motion`**: Tailwind **v4** supports **`motion-reduce:`** variant prefix (`tailwindcss` docs); pairing **`motion-safe:`** with animations avoids violating AC4.

### References

| Topic | Source |
|-------|--------|
| Story acceptance source | [`epics.md` Story 4.3](../planning-artifacts/epics.md) |
| UX-DR6 row | [`docs/ux-backlog.md`](../../docs/ux-backlog.md) |
| UX bounded motion/upload regions | [`ux-design-specification.md`](../planning-artifacts/ux-design-specification.md) |
| Failure taxonomy context | [`homeinspection-api/docs/api/failure-matrix.md`](../../homeinspection-api/docs/api/failure-matrix.md) |
| Max upload wiring reference | [`report.controller.ts`](../../homeinspection-api/src/modules/report/report.controller.ts) |
| Upload integration boundary | [`uploadReport.ts`](../../homeinspection-web/src/api/uploadReport.ts) |
| NFR1 wording anchor | [`prd.md` NFR1](../planning-artifacts/prd.md) |

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

- Vitest + boundary checks via exported **`validatePdfUploadCandidate`** (no 20 MB allocations).
- `npm run test`, `npm run lint`, `npm run build` — all passing in **`homeinspection-web/`** after implementation.

### Completion Notes List

- **`uploadLimits.ts`**: `MAX_UPLOAD_BYTES`, `PDF_MIME_TYPE`, `PDF_FRIENDLY_MIME_TYPES` + API doc `@see` references.
- **`validatePdfFile.ts`**: size/type gates (`application/pdf` accepts any name; empty/octet-stream MIME requires `.pdf` suffix).
- **`UploadProcessingStatus`**: indeterminate spinner + **`motion-reduce`** static bullet; **NFR1**-aligned non-guarantee copy.
- **`UploadPage`**: constraints panel above picker; **`role="alert"`** client errors; **`aria-busy`** on `<form>`; **`min-w-[11rem]`** submit tap target.
- **Docs:** README opening paragraph + **design-foundations** § Upload constraints — UX-DR6 / NFR1 / failure-matrix traceability.

### File List

- `homeinspection-web/src/features/upload/uploadLimits.ts`
- `homeinspection-web/src/features/upload/validatePdfFile.ts`
- `homeinspection-web/src/features/upload/validatePdfFile.spec.ts`
- `homeinspection-web/src/features/upload/UploadProcessingStatus.tsx`
- `homeinspection-web/src/pages/UploadPage.tsx`
- `homeinspection-web/README.md`
- `homeinspection-web/docs/design-foundations.md`

## Change Log

- **2026-05-10:** Implementation complete — Story **4.3** upload UX, validation module + tests, bounded-wait banner; status → **review**; sprint **`4-3-*`** → **review**.
- **2026-05-11:** Marked **done** in sprint after acceptance; Story **4.4** queued next.

## Questions / Clarifications (non-blocking)

1. **Cancel upload:** UX mentions cancel **when supported** — `AbortSignal`/abort UX **not** required for MVP unless product confirms ( **`fetch`** teardown complexity ); defer explicit cancel unless requested.

---

_Ultimate context engine analysis completed — comprehensive developer guide created._
