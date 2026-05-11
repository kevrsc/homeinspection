# Story 4.5: Observation list and section grouping (Direction 1 baseline)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a homeowner with a successful extraction,  
I want observations grouped by section with badges that include text labels and non-color-only status cues,  
So that I can scan results quickly on mobile or desktop (UX-DR4).

## Acceptance Criteria

1. **AC1 — Section grouping**  
   **Given** a Phase 1 success payload with **`sections`** / **`sectionName`** / **`observations[].text`** ([`openapi/openapi.json`](../../homeinspection-api/openapi/openapi.json), [`upload-success.json`](../../homeinspection-api/test/fixtures/json/upload-success.json)),  
   **When** **`ResultsPage`** renders after navigation from **`UploadPage`**,  
   **Then** observations appear **under labeled section headings** derived from **`sectionName`** (humanized via **`formatSectionHeading`**).

2. **AC2 — Direction 1 density & chrome**  
   **When** the list renders,  
   **Then** row chrome uses calm-neutral Direction 1 tokens (`border-border`, `bg-surface`, readable **`text-fg`**) consistent with Story **4.2**.  
   **And** visual density targets a scannable list (comfortable padding, section **`space-y`** rhythm).

3. **AC3 — Badge semantics (icon + visible text)**  
   **Given** the API does **not** expose severity tags in **`v1`** observations today,  
   **When** each observation row renders,  
   **Then** a compact **Observation** badge pairs **decorative icon + explicit text label** — **not** color-only status — satisfying UX-DR4 backlog intent until richer server metadata exists.

4. **AC4 — Keyboard traversal**  
   **When** navigating with **Tab**,  
   **Then** focus moves through observation rows (**`tabIndex={0}`** on each **`<li>`**) with **`focus-visible`** outlines aligned to **`outline-link`** treatment.

5. **AC5 — Invalid / unexpected payload**  
   **When** `location.state.json` is **not** a valid success envelope,  
   **Then** the page shows a readable error explanation plus collapsible **raw JSON** for prototype debugging — **without** claiming success.

6. **AC6 — Verification**  
   **When** **`npm run test`**, **`npm run lint`**, **`npm run build`** run in **`homeinspection-web/`**,  
   **Then** they **pass** — including **`uploadSuccessModel.spec.ts`** coverage derived from fixture shapes.

## Tasks / Subtasks

- [x] **T1 — Success payload model** (AC: 1, 5, 6)  
  - [x] Implement **`parseUploadSuccess`** + **`UploadSuccessPayload`** types ([`uploadSuccessModel.ts`](../../homeinspection-web/src/features/results/uploadSuccessModel.ts)).  
  - [x] **`formatSectionHeading`** for display titles.  
  - [x] Vitest coverage ([`uploadSuccessModel.spec.ts`](../../homeinspection-web/src/features/results/uploadSuccessModel.spec.ts)).

- [x] **T2 — `ObservationResults` UI** (AC: 2, 3, 4)  
  - [x] Section **`h2`** + **`ul`/`li`** rows with **`ObservationBadge`** (SVG list icon + **Observation** text).  
  - [x] **`tabIndex={0}`** + **`focus-visible`** outline on rows.

- [x] **T3 — `ResultsPage` integration** (AC: 1, 5)  
  - [x] Replace raw **`JSON.stringify`** primary view with **`ObservationResults`** when **`parseUploadSuccess`** succeeds.  
  - [x] Invalid branch messaging + **`<details>`** raw fallback.

- [x] **T4 — UX traceability** (AC: 2)  
  - [x] Compare visually against [**`ux-design-directions.html`**](../planning-artifacts/ux-design-directions.html) Direction **1** intent during review — documented deviation: **no sticky section headers** in this story (defer until **4.7**/**4.8** per focus-trap caution in [`ux-backlog.md`](../../docs/ux-backlog.md)).

- [x] **T5 — Documentation** (AC: 2)  
  - [x] README + **`design-foundations.md`** § Observation results (**UX-DR4**).

- [x] **T6 — Regression suite** (AC: 6)  
  - [x] **`npm run test` / lint / build`** green.

## Dev Notes

### References

| Topic | Source |
|-------|--------|
| Epic Story 4.5 | [`epics.md`](../planning-artifacts/epics.md) |
| UX-DR4 | [`docs/ux-backlog.md`](../../docs/ux-backlog.md) |
| Success fixture | [`upload-success.json`](../../homeinspection-api/test/fixtures/json/upload-success.json) |

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

- **`uploadSuccessModel.spec.ts`** — canonical fixture + rejection paths + heading formatter.

### Completion Notes List

- **`parseUploadSuccess`** tolerates missing **`pageCount`** at runtime while validating **`sections`** / **`text`** strictly.
- **`ObservationResults`** ships informational **Observation** badge (API lacks severity field).
- **`ResultsPage`** heading updated to homeowner-facing **Inspection observations**; Story **4.6** disclaimer called out in subtitle as **next**.

### File List

- `homeinspection-web/src/features/results/uploadSuccessModel.ts`
- `homeinspection-web/src/features/results/uploadSuccessModel.spec.ts`
- `homeinspection-web/src/features/results/ObservationResults.tsx`
- `homeinspection-web/src/pages/ResultsPage.tsx`
- `homeinspection-web/README.md`
- `homeinspection-web/docs/design-foundations.md`

## Change Log

- **2026-05-11:** Story **4.5** implemented — observation list + parser + docs; sprint **`4-5-*`** → **review**.

---

_Ultimate context engine analysis completed — comprehensive developer guide created._
