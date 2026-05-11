# Story 4.7: Responsive polish and optional lg master-detail layout

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a homeowner on tablet or desktop,  
I want layouts that scale to wider breakpoints without horizontal scroll on core flows,  
So that optional master-detail observation browsing matches UX Direction 5 guidance where adopted (UX-DR9).

## Acceptance Criteria

1. **AC1 — Narrow viewport usability**  
   **Given** viewport widths down to **~320px**,  
   **When** exercising upload → structured error → successful results paths,  
   **Then** primary layouts avoid **horizontal page scrolling** (excluding intentional scroll inside **`pre`** / code panels).

2. **AC2 — Overflow containment**  
   **Then** long observation text and dense paragraphs **`break-words`** (or equivalent) within **`min-w-0`** flex/grid descendants so flex layouts don’t inflate beyond **`100vw`**.

3. **AC3 — Shell refinements**  
   **Then** **`AppShell`** applies **`overflow-x-hidden`** on the outer viewport wrapper and widens **`lg`** **`max-width`** modestly (**`lg:max-w-6xl`**) to support Direction **5**-style observation layouts without rewriting Story **4.2** token semantics.

4. **AC4 — Optional `lg` master–detail**  
   **At `lg+`,** **`ObservationResults`** presents an optional **section rail** (**`<nav aria-label="Report sections">`**) plus **detail** pane showing **one active section** at a time.  
   **Below `lg`,** preserve stacked multi-section layout (**Story 4.5** behavior).

5. **AC5 — Focus safety**  
   **Then** master–detail uses **no `sticky` headers/nav** in this story (static positioning only).  
   **And** **`Tab`** order visits section controls **before** observation rows in the detail pane (`lg`), preserving predictable keyboard traversal.

6. **AC6 — Verification**  
   **Then** **`npm run lint`**, **`npm run build`**, **`npm run test`** pass in **`homeinspection-web/`**.

## Tasks / Subtasks

- [x] **T1 — AppShell & page wrappers** (AC: 1–3, 6)  
  - [x] **`overflow-x-hidden`**, **`min-w-0`**, **`lg:max-w-6xl`**, **`lg:px-8`** on **`AppShell`**.  
  - [x] **`UploadPage`** / **`ResultsPage`** **`main`**: **`min-w-0 max-w-full`**; **`UploadPage`** file input **`max-w-full md:max-w-md`**.

- [x] **T2 — Typography overflow** (AC: 2)  
  - [x] **`break-words`** on observation body copy, section headings, disclaimer primary copy, upload header blurb, error **`UploadErrorPanel`** messages.

- [x] **T3 — `ObservationResults` master–detail** (AC: 4–5)  
  - [x] Extract **`SectionObservations`**; add **`activeSectionIndex`** state reset on **`data`** change.  
  - [x] **`lg`** grid + **`nav`** buttons with **`aria-current`** on selection — **no sticky positioning**.

- [x] **T4 — Documentation** (AC: 3–4)  
  - [x] README + **`design-foundations.md`** (Layout shell, Observation results, Responsive polish sections).

## Dev Notes

### References

| Topic | Source |
|-------|--------|
| Epic Story 4.7 | [`epics.md`](../planning-artifacts/epics.md) |
| UX-DR9 | [`docs/ux-backlog.md`](../../docs/ux-backlog.md) |

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

### Completion Notes List

- **`ObservationResults`**: mobile stacked vs **`lg`** **`nav` + single-section detail**; section **`SectionObservations`** reused for both modes.
- **`UploadErrorPanel`** / invalid **`ResultsPage`** panels: **`min-w-0 max-w-full`** + **`break-words`** on narrative copy.

### File List

- `homeinspection-web/src/layout/AppShell.tsx`
- `homeinspection-web/src/features/results/ObservationResults.tsx`
- `homeinspection-web/src/features/results/ResultsDisclaimerStrip.tsx`
- `homeinspection-web/src/features/upload/UploadErrorPanel.tsx`
- `homeinspection-web/src/pages/UploadPage.tsx`
- `homeinspection-web/src/pages/ResultsPage.tsx`
- `homeinspection-web/README.md`
- `homeinspection-web/docs/design-foundations.md`

## Change Log

- **2026-05-11:** Story **4.7** implemented — responsive overflow guards + **`lg`** master–detail; sprint **`4-7-*`** → **review**; Story **4.6** marked **done**.
- **2026-05-11:** Marked **done** after lint/build/test pass + artifact completion (invalid-results overflow tweak, README / design-foundations).

---

_Ultimate context engine analysis completed — comprehensive developer guide created._
