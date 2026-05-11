# Story 4.9: Docs readability theme when a docs site ships (UX-DR10)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an integrator reading published API documentation,  
I want prose width, heading hierarchy, and code block contrast aligned to UX-DR10,  
So that developer docs match readability commitments when a site exists outside Phase 1 markdown-only paths.

## Acceptance Criteria

1. **AC1 — Layout targets**  
   **Given** a docs site generator or theme is chosen (may remain stubbed until infra exists),  
   **When** long-form pages render,  
   **Then** line length targets **~72ch** where applicable and headings follow logical order.

2. **AC2 — Code samples**  
   **Then** code samples meet contrast guidance for light theme (and dark if supported).

3. **AC3 — Deferral path**  
   **If** no docs site is deployed in this epic’s timeframe,  
   **Then** this story documents the deferral rationale and leaves theme tokens or references ready for adoption.

## Tasks / Subtasks

- [x] **T1 — Scope decision** — No docs site in repo; deferral path (**AC3**) applies.
- [ ] **T2 — Theme / CSS** — N/A until generator/site exists; checklist defers implementation.
- [x] **T3 — Documentation** — [`docs/docs-readability-ux-dr10.md`](../../docs/docs-readability-ux-dr10.md).

## Dev Notes

### References

| Topic | Source |
|-------|--------|
| Epic Story 4.9 | [`epics.md`](../planning-artifacts/epics.md) |
| UX-DR10 | [`docs/ux-backlog.md`](../../docs/ux-backlog.md) |

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Completion Notes List

- Delivered **deferral + adoption checklist** only — satisfies **AC3**; **AC1/AC2** apply when a docs UI ships.

### File List

- `docs/docs-readability-ux-dr10.md`

### Change Log

- **2026-05-11:** Documented UX-DR10 deferral and future adoption checklist; sprint **`4-9-*`** → **done**.

---

_Ultimate context engine analysis completed — comprehensive developer guide created._
