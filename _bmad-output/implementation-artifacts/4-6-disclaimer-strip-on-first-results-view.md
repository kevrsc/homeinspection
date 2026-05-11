# Story 4.6: Disclaimer strip on first results view

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a homeowner reviewing extracted observations,  
I want a persistent disclaimer that the output is a starting to-do list—not legal advice or a substitute for the full report,  
So that expectations match PRD positioning (UX-DR7).

## Acceptance Criteria

1. **AC1 — Successful extraction scope**  
   **Given** **`ResultsPage`** shows **`ObservationResults`** (`parseUploadSuccess` **ok**),  
   **When** the view renders,  
   **Then** a **low-emphasis disclaimer strip** appears **above** the observation list **without obscuring** primary content.

2. **AC2 — Persistent primary copy**  
   **Then** at least one sentence of obligation-framing copy remains **always visible** in the strip (not gated exclusively behind expand, modal, or tooltip).

3. **AC3 — Optional elaboration**  
   **When** the user expands supplementary detail,  
   **Then** it uses inline **`<details>` / `<summary>`** (or equivalent non-modal pattern).  
   **And** the expanded content **does not replace** or **hide** the only instance of the primary disclaimer.

4. **AC4 — Session rule (documented)**  
   **Product rule:** the strip renders on **every successful `/results` render** with valid success payload in this prototype (each upload → results journey). Persistently frames expectations while that screen is shown; revisiting without route state does not apply.

5. **AC5 — Accessibility**  
   **Then** the strip exposes a discoverable heading (**`sr-only` `h2`**) labeling the notice region for screen readers.

6. **AC6 — Verification**  
   **When** **`npm run lint`**, **`npm run build`**, **`npm run test`** run in **`homeinspection-web/`**,  
   **Then** they **pass**.

## Tasks / Subtasks

- [x] **T1 — `ResultsDisclaimerStrip`** (AC: 1–3, 5)  
  - [x] **`aside`** + Direction 1 low-emphasis chrome (`bg-page`, `border-border`, readable **`text-fg`** / **`text-fg-muted`**).  
  - [x] Primary paragraph always visible; **`details`** for extended guidance.

- [x] **T2 — `ResultsPage` wiring** (AC: 1, 4)  
  - [x] Render strip **only** when **`parsed.ok`**; placement before **`ObservationResults`**.  
  - [x] Remove obsolete subtitle deferral to Story **4.6**.

- [x] **T3 — Documentation** (AC: 2)  
  - [x] README + **`design-foundations.md`** § Disclaimer (**UX-DR7**).

- [x] **T4 — Regression** (AC: 6)  
  - [x] Lint / test / build green.

## Dev Notes

### References

| Topic | Source |
|-------|--------|
| Epic Story 4.6 | [`epics.md`](../planning-artifacts/epics.md) |
| UX-DR7 | [`docs/ux-backlog.md`](../../docs/ux-backlog.md) |

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

### Completion Notes List

- **`ResultsDisclaimerStrip.tsx`** — UX-DR7 copy + **`details`** elaboration; invalid results branch unchanged (no strip).

### File List

- `homeinspection-web/src/features/results/ResultsDisclaimerStrip.tsx`
- `homeinspection-web/src/pages/ResultsPage.tsx`
- `homeinspection-web/README.md`
- `homeinspection-web/docs/design-foundations.md`

## Change Log

- **2026-05-11:** Story **4.6** implemented — disclaimer strip + docs; sprint **`4-6-*`** → **review**; Story **4.5** marked **done**.
- **2026-05-11:** Accepted complete — sprint **`4-6-*`** → **done**; Story **4.7** started next.

---

_Ultimate context engine analysis completed — comprehensive developer guide created._
