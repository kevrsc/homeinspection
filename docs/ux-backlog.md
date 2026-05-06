# Phase 2 UI — UX traceability backlog

This backlog maps **UX-DR4–UX-DR10** (from [`_bmad-output/planning-artifacts/epics.md`](../_bmad-output/planning-artifacts/epics.md)) to the prose in the [**UX Design Specification**](../_bmad-output/planning-artifacts/ux-design-specification.md) so Phase 2 UI work can be picked up without re-deriving decisions.

**Related:** Epic 3 Story 3.1 — [`3-1-ux-spec-traceability-backlog-for-deferred-ui.md`](../_bmad-output/implementation-artifacts/3-1-ux-spec-traceability-backlog-for-deferred-ui.md).

---

## Phase 1 vs Phase 2 boundary

**System of record for Phase 1**

- HTTP capability: **`POST /v1/report/upload`** (`homeinspection-api`).
- Published contracts and integrator docs: **`homeinspection-api/openapi/openapi.json`**, **`homeinspection-api/docs/api/failure-matrix.md`**, JSON fixtures under **`homeinspection-api/test/fixtures/json/`**.

**Phase 2 track**

- **First-party homeowner UI** (and partner UIs that choose to follow this spec) is a **separate delivery track**. UI work **must not** change API semantics unless handled through explicit **versioning / contract-change** processes.
- UX rows below describe **client-side** obligations and future stories; they do not redefine server payloads.

---

## Design directions reference

Interactive exploration of layout/visual directions (baseline **Direction 1 — calm neutral list**):

- [`_bmad-output/planning-artifacts/ux-design-directions.html`](../_bmad-output/planning-artifacts/ux-design-directions.html)

Overrides (e.g. Direction 4 contrast tokens, Direction 5 split layout at large breakpoints) are described under **Design Direction Decision** in the UX spec.

---

## Master backlog (UX-DR4–UX-DR10)

| ID | Requirement (summary) | UX spec sections (detail) | Design directions (`ux-design-directions.html`) | Suggested future story titles | Test notes |
|----|-------------------------|----------------------------|---------------------------------------------------|-------------------------------|------------|
| **UX-DR4** | Phase 2 homeowner client implements **Direction 1** calm-neutral **observation list**: section grouping, **badges with text labels**, scannable rows (code deferred until UI funded). | *Design Direction Decision*; *Component Strategy* → Custom components (**Observation list item**, **Section group header**); *Visual Design Foundation* (semantic color intent for badges). | **Direction 1** primary reference; Directions **4** / **5** for contrast or split-layout overrides per spec. | “Observation list & section chrome (Direction 1 baseline)”; “Badge semantics + non-color status affordances”. | **Responsive:** single-column mobile-first; sticky section headers only where spec allows without focus traps. **A11y:** badge text + icon; list/listitem semantics; keyboard through rows. **Visual:** compare implementation to Direction 1 mockups in HTML showcase. |
| **UX-DR5** | **Error presentation:** action-first copy from API **`code`**, **`message`**, **`requestId`**; include **copy request id** in client specs (UI deferred). | *Component Strategy* → **Structured error panel**; *Feedback Patterns*; *Core User Experience* / journey diagrams (validation vs extraction paths). | Direction 1 panels for calm error chrome; use Direction **4** if contrast audit fails. | “Structured error panel + API code mapping”; “Copy Request ID affordance (SR + clipboard)”. | **A11y:** `requestId` exposed as readable text; focus management when error replaces results; **live region** when status changes without navigation. **Integration:** matrix-driven cases in `homeinspection-api/docs/api/failure-matrix.md`. |
| **UX-DR6** | **Upload UX:** show **PDF-only, 20 MB** (and any client-side mirrors) **before** upload; **bounded-wait** messaging while processing (documented for client authors). | *Component Strategy* → **Upload and progress region**; *Form Patterns*; *Experience Mechanics* (feedback / bounded waiting). | Direction 1 upload/results flow density. | “Upload shell + pre-flight constraints UI”; “Processing / timeout / retry messaging aligned with API SLO”. | **Responsive:** tap targets ≥ 44×44px (spec). **A11y:** honor **`prefers-reduced-motion`** for progress. **Note:** server constraints already documented for integrators (`failure-matrix.md`, OpenAPI)—UI row is **client presentation**. |
| **UX-DR7** | **Persistent disclaimer:** output is a **starting to-do list**, not legal advice or full-report substitute (documented for client authors). | *Component Strategy* → **Disclaimer strip**; *Emotional Design Principles* / honesty; *Additional Patterns* (modal sparingly for detail). | Direction 1 low-emphasis footer/strip treatment. | “Disclaimer strip on first results view”; “Expandable legal/expectation detail (optional modal)”. | **A11y:** persistent region discoverable; avoid burying critical framing only in modal. **Copy:** consistent with PRD positioning. |
| **UX-DR8** | **WCAG 2.2 AA** for first-party UI: keyboard order, **focus visibility**, **non-color-only** status, **live region** for async completion. | *Accessibility Considerations* (Design System Foundation); *Accessibility Strategy*; *Responsive Design & Accessibility* → **Testing Strategy**. | Use Direction **4** tokens if Direction 1 contrast insufficient after measurement. | “WCAG AA baseline for observation + error flows”; “Live region + focus order audit for upload → result”. | **A11y:** contrast 4.5:1 normal text; keyboard-only pass; **axe-core** (or equivalent) in UI CI; VoiceOver / NVDA spot-check per spec. **Responsive:** touch targets and spacing at **320px** width. |
| **UX-DR9** | Document **responsive breakpoints** (`sm` / `md` / `lg`) and **mobile-first single-column** observation review. | *Responsive Strategy*; *Breakpoint Strategy* (`sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px); tie-in to optional split view (Direction 5) at `lg+`. | Directions **1** (narrow) vs **5** (wide). | “Responsive layout tokens + breakpoint behaviors”; “Optional master–detail observation layout at `lg`”. | **Responsive:** verify **320px**, tablet, desktop; no horizontal scroll on core flow. **A11y:** sticky headers must not trap focus (spec). |
| **UX-DR10** | When a **docs site** exists: **~72ch** readable line length, **heading hierarchy**, **code block contrast**. | *Responsive Strategy* (desktop integrators); *Implementation Guidelines* (Phase 1 OpenAPI/markdown readability). | N/A (documentation chrome). | “Docs theme: measure & cap prose width”; “Syntax highlighting + contrast checklist for code samples”. | **Docs UX:** heading order (`h1`→`h2`…); code blocks readable in light/dark if supported; manual pass on longest narrative pages. |

---

## Checklist (quick)

Use this when slicing Phase 2/3 UI epics:

- [ ] UX-DR4 — Direction 1 list & badges planned or consciously varied (document override).
- [ ] UX-DR5 — Error panel + copy-request-id + live region considered.
- [ ] UX-DR6 — Constraints-before-upload + wait messaging match API docs.
- [ ] UX-DR7 — Disclaimer visible on results path.
- [ ] UX-DR8 — WCAG 2.2 AA criteria in acceptance / Definition of Done.
- [ ] UX-DR9 — Breakpoints and mobile-first flow specified for observation UI.
- [ ] UX-DR10 — Docs site readability criteria applied when publishing developer docs.
