# Story 3.1: UX spec traceability backlog for deferred UI

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a product strategist,  
I want UX-DR items that apply only to Phase 2 UI consolidated into an actionable backlog checklist,  
so that sprint planning can pick up UI work without re-deriving UX decisions (FR40, UX-DR4–UX-DR10).

## Acceptance Criteria

1. **AC1 - Backlog artifact exists at agreed path**  
   **Given** the UX Design Specification and epics document define deferred UI requirements,  
   **When** a reviewer opens the backlog artifact,  
   **Then** it is committed at **`docs/ux-backlog.md`** (repo root `docs/` folder; create the folder if absent), **or** an appendix section is added to `epics.md` **instead**—pick **one** primary surface and link to it from the other so there is no orphaned duplicate.  
   **Recommendation:** Use **`docs/ux-backlog.md`** as primary (matches `_bmad-output/planning-artifacts/epics.md` Story 3.1 wording).

2. **AC2 - Full UX-DR4–UX-DR10 coverage**  
   **When** the backlog is reviewed,  
   **Then** **each** of **UX-DR4, UX-DR5, UX-DR6, UX-DR7, UX-DR8, UX-DR9, UX-DR10** maps to **at least one** checklist row containing:
   - Short restatement of the requirement (may quote or paraphrase `_bmad-output/planning-artifacts/ux-design-specification.md`).
   - **Suggested future story title(s)** (implementation-neutral; sized for Phase 2/3 UI epics).
   - **Test notes:** explicit mention where applicable of **accessibility** (WCAG 2.2 AA themes), **responsive** behavior (`sm`/`md`/`lg` / mobile-first), and **design direction** reference to **`_bmad-output/planning-artifacts/ux-design-directions.html`** (paths relative to repo root or clearly labeled).

3. **AC3 - Phase 1 vs Phase 2 boundary**  
   **When** the backlog is read top-to-bottom,  
   **Then** an explicit callout states that **`POST /v1/report/upload` and published API/OpenAPI/failure-matrix artifacts remain the system of record** for Phase 1; **first-party homeowner UI is a separate delivery track** and must not imply-contract changes without versioning policy.

4. **AC4 - Traceability to sources**  
   **When** implementing teams use the backlog,  
   **Then** each UX-DR row cites **where** the detail lives in the UX spec (section heading names are sufficient; line numbers optional).

5. **AC5 - No accidental API scope creep**  
   **Given** this story is planning/traceability documentation,  
   **When** changes are merged,  
   **Then** **no** behavior change is introduced to `homeinspection-api` runtime, routes, or dependencies solely for this story (README/link-only edits at repo root are acceptable).

## Tasks / Subtasks

- [x] **T1 - Create primary backlog document** (AC: 1, 3, 4, 5)  
  - [x] Add `docs/ux-backlog.md` with a short introduction, the Phase 1 / Phase 2 boundary callout (AC3), and a **single master table or checklist** covering UX-DR4–UX-DR10 (AC2).  
  - [x] Ensure `_bmad-output/planning-artifacts/ux-design-directions.html` is referenced from relevant rows (Direction 1 baseline, overrides per spec).

- [x] **T2 - Map each UX-DR to spec sections** (AC: 2, 4)  
  - [x] **UX-DR4** — Direction 1 calm-neutral observation list; badges with text labels; scannable rows → tie to *Design Direction Decision*, *Component Strategy* (Observation list item, Section group header), *Visual Design Foundation* as needed.  
  - [x] **UX-DR5** — Error presentation: action-first copy from API codes; “copy request id” affordance → tie to *Component Strategy* (Structured error panel), *Feedback Patterns*, *Core User Experience* journey flows.  
  - [x] **UX-DR6** — Upload UX: visible constraints before upload (PDF-only, 20 MB); bounded-wait messaging → tie to *Component Strategy* (Upload and progress region), *Form Patterns*; note **Epic 2** already documents integrator-facing constraints (`homeinspection-api/docs/api/failure-matrix.md`, OpenAPI)—Phase 2 row focuses **client UI** behavior.  
  - [x] **UX-DR7** — Persistent disclaimer: starting to-do list, not legal advice / full report substitute → tie to *Component Strategy* (Disclaimer strip), *Emotional Design Principles / Honesty*.  
  - [x] **UX-DR8** — WCAG 2.2 AA targets; keyboard order; focus visibility; non-color-only status; live region guidance → tie to *Accessibility Considerations*, *Accessibility Strategy*, *Responsive Design & Accessibility* testing bullets.  
  - [x] **UX-DR9** — Responsive breakpoints `sm`/`md`/`lg`; mobile-first single-column flow → tie to *Responsive Strategy*, *Breakpoint Strategy*.  
  - [x] **UX-DR10** — Docs site readability (~72ch prose, heading hierarchy, code block contrast) → tie to *Responsive Strategy* (desktop/docs), *Implementation Guidelines* (Phase 1 OpenAPI/markdown readability).

- [x] **T3 - Cross-links and discoverability** (AC: 1, 4, 5)  
  - [x] From `docs/ux-backlog.md`, link to `_bmad-output/planning-artifacts/ux-design-specification.md` and `_bmad-output/planning-artifacts/epics.md` (Epic 3 context).  
  - [x] Optionally add **one line** under root `README.MD` pointing to `docs/ux-backlog.md` under a “Phase 2 planning” or similar heading—**only if** it improves discovery without bloating the README.

- [x] **T4 - Verify non-regression** (AC: 5)  
  - [x] Run `npm run lint`, `npm run build`, `npm run test`, and `npm run test:e2e` in `homeinspection-api/` after edits (should be unchanged if API tree untouched).

### Review Findings

- [x] [Review][Patch] Fix broken relative link to Story 3.1 artifact in `docs/ux-backlog.md` related-reference line [`docs/ux-backlog.md`]
- [x] [Review][Patch] Convert plain-text backlog reference in `epics.md` to clickable markdown link for better traceability/discoverability [`_bmad-output/planning-artifacts/epics.md`]
- [x] [Review][Defer] Top comment metadata in `sprint-status.yaml` (`# last_updated: 2026-05-04`) drifts from active YAML field; cosmetic/pre-existing tracker drift [`_bmad-output/implementation-artifacts/sprint-status.yaml`] — deferred, pre-existing

## Dev Notes

### Epic and Story Context

- **Epic 3** bridges **FR40** (extension path for UI) into **actionable Phase 2 planning** without expanding Phase 1 API scope.
- **Epics source:** [`_bmad-output/planning-artifacts/epics.md`](../planning-artifacts/epics.md) — Story 3.1 acceptance criteria are authoritative for artifact shape.
- **Requirements IDs UX-DR4–DR10** are enumerated in the **Requirements Inventory** inside `epics.md` (UX Design Requirements); the UX spec prose expands them under headings such as *Design Direction Decision*, *Component Strategy*, *Responsive Design & Accessibility*, etc.

### Source documents (READ BEFORE WRITING)

| Document | Role |
|----------|------|
| `_bmad-output/planning-artifacts/ux-design-specification.md` | Primary UX prose for Directions 1–6, components, responsive/a11y, consistency patterns. |
| `_bmad-output/planning-artifacts/ux-design-directions.html` | Visual exploration of six directions; **Direction 1** is provisional default; cite when backlog rows discuss layout/visual hierarchy. |
| `_bmad-output/planning-artifacts/epics.md` | Story definition + UX-DR ID list. |
| `homeinspection-api/docs/api/failure-matrix.md` | Already satisfies integrator-facing failure narrative; reference from UX-DR5/6 rows where relevant—do not duplicate tables. |
| `homeinspection-api/openapi/openapi.json` | Contract anchor for Phase 1—cite from boundary callout (AC3). |

### Architecture compliance

- Phase 1 remains **API-first** per `_bmad-output/planning-artifacts/architecture.md` and project-context ports/adapters discipline; this story **does not** add Nest modules, UI frameworks, or SSR apps.
- Future UI may adopt **Radix + Tailwind / shadcn-style** patterns per UX spec—the backlog should treat that as **planned**, not implement it here.

### Technical requirements

- **Format:** Markdown, ASCII-safe, readable in GitHub and editors.
- **Deliverable path:** `docs/ux-backlog.md` (preferred). If the repo policy forbids new top-level folders, document the exception in the story Completion Notes and use `epics.md` appendix **plus** a prominent link from `docs/` — **avoid** two divergent checklists without cross-links.

### Testing requirements

- No automated tests required for markdown-only work unless the team adds a trivial CI check (optional).
- **AC5:** Full API test suite remains green after merge.

### Previous epic intelligence (Epic 2 closure)

- **Epic 2 retrospective** [`epic-2-retro-2026-05-06.md`](./epic-2-retro-2026-05-06.md) recommends a **contract-change checklist** when touching upload responses—future UI stories should consume API contracts as-is until versioning stories exist.
- **Story 2.10** [`2-10-documented-extension-ports-for-future-phases.md`](./2-10-documented-extension-ports-for-future-phases.md) documents **future HTTP/UI** seams—cross-reference in AC3 boundary section if helpful.

### Git intelligence

- Recent commits emphasize **docs + contract alignment** (`failure-matrix`, OpenAPI, extension READMEs). Match that tone: **short paragraphs**, **stable paths**, **no speculative endpoints**.

### Latest technical information

- **WCAG 2.2** remains the cited accessibility baseline in the UX spec; backlog test notes should name **keyboard**, **focus**, **contrast**, **live regions**, and tooling examples (**axe-core**, VoiceOver/NVDA spot-checks) where UX spec already does.

### Project context reference

- Follow `_bmad-output/project-context.md`: no silent contract drift; Phase 1 API boundaries respected.

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

- Sprint discovery: first `backlog` story → **3-1-ux-spec-traceability-backlog-for-deferred-ui**; Epic **3** was `backlog` → set **`in-progress`** when creating first story per BMAD workflow.
- Loaded `epics.md` Story 3.1, UX spec sections for Directions/components/responsive/a11y, `ux-design-directions.html` path under planning-artifacts.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added primary backlog at **`docs/ux-backlog.md`**: Phase 1 boundary callout, `ux-design-directions.html` reference, master table for UX-DR4–UX-DR10 with spec sections, suggested stories, and test notes (a11y, responsive).
- Linked from root **`README.MD`** under **Phase 2 UI planning**. Full **`homeinspection-api`** lint/build/test/e2e gates green (no API code changes).
- Code review patches: corrected Story 3.1 relative link from `docs/ux-backlog.md`; made `epics.md` backlog reference a clickable relative link.

### File List

- `_bmad-output/implementation-artifacts/3-1-ux-spec-traceability-backlog-for-deferred-ui.md`
- `docs/ux-backlog.md`
- `README.MD`
- `_bmad-output/planning-artifacts/epics.md`

---

## Change Log

- **2026-05-06:** Story created via `bmad-create-story`; status set to `ready-for-dev`.
- **2026-05-06:** Implemented `docs/ux-backlog.md` + README discoverability; tasks completed; status `ready-for-dev` → `review`; gates verified green.
- **2026-05-06:** Code review patches applied (story-artifact link from docs; clickable backlog link in `epics.md`); status `review` → `done`.
