# Story 2.10: Documented extension ports for future phases

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a product owner,  
I want clear seams in code and docs for persistence, async, AI, and UI phases,  
so that Phase 1 delivery does not paint us into a corner (FR37–FR39, NFR17).

## Acceptance Criteria

1. **AC1 - Persistence seam documented**  
   **Given** Epic 2 completes with a stateless upload/extract path,  
   **When** a reviewer reads the chosen documentation surface (`homeinspection-api/README.md` and/or an Architecture-linked module README under `homeinspection-api/src/modules/report/`),  
   **Then** they see where durable storage of uploads, extractions, or audit metadata would attach (module boundaries and suggested hook points in the orchestration flow) **without** introducing database drivers, migrations, or repository implementations in Phase 1.

2. **AC2 - Async / queue seam documented**  
   **Given** Phase 1 remains synchronous request/response,  
   **When** the same documentation is reviewed,  
   **Then** it explains where outbound events or queue publishing would plug in after validation/extraction outcomes, aligned with architecture guidance (`report.uploaded`-style events, versioned payloads) and **without** adding SQS/AWS SDK consumers or dormant worker processes required for CI.

3. **AC3 - AI enrichment seam documented**  
   **When** the documentation is reviewed,  
   **Then** it describes how future AI-assisted enrichment could sit behind an additional port or decorator-style step after `PdfObservationExtractor` returns structured observations (or as a swap-in adapter policy), preserving the stable `POST /v1/report/upload` response contract unless/until versioning explicitly changes.

4. **AC4 - Future HTTP / UI-facing API seam documented**  
   **When** the documentation is reviewed,  
   **Then** it states how additional versioned routes or modules (e.g. homeowner-facing resources) would be added alongside—not inside—the existing `v1` upload handler, referencing Epic 3 / FR40 planning without implementing UI.

5. **AC5 - Quality gates and no dormant infra**  
   **Given** this story is documentation-only for runtime behavior,  
   **When** `npm run lint`, `npm run build`, `npm run test`, and `npm run test:e2e` run in `homeinspection-api/`,  
   **Then** all pass; **no** new dependencies, queue listeners, DB connections, or unused scaffolding code are introduced solely to satisfy this story.

## Tasks / Subtasks

- [x] **T1 - Author extension seams section in service README** (AC: 1–4, 5)  
  - [x] Add a concise **“Extension ports & future phases”** (or equivalent) section to `homeinspection-api/README.md` that names the four seams: persistence, async/events, AI enrichment, future HTTP/UI-track APIs.  
  - [x] Cross-link to `_bmad-output/planning-artifacts/architecture.md` (ports/adapters, Phase 1 stateless flow, deferred persistence/queue notes) and to `docs/api/failure-matrix.md` only where it helps (contract stability); avoid duplicating failure-matrix content.

- [x] **T2 - Add Architecture-linked module README for `report`** (AC: 1–4, 5)  
  - [x] Create `homeinspection-api/src/modules/report/README.md` mapping: `ReportController` (HTTP boundary), `ReportService` (orchestration / timeout / mapping), `PDF_OBSERVATION_EXTRACTOR` + `PdfObservationExtractor` (`extractors/pdf-observation-extractor.port.ts`, `PdfObservationExtractorAdapter`).  
  - [x] For each future seam, state the **recommended attachment point** (e.g. after successful `extractPreview` mapping and before response; side-effect interface injected into `ReportService`; new Nest module importing `ReportModule` exports vs. editing controller signatures).  
  - [x] Explicitly state **anti-goals for Phase 1**: no AWS SDK, no MySQL driver, no background consumers checked into CI path.

- [x] **T3 - Align terminology with planning artifacts** (AC: 1–4)  
  - [x] Use FR37–FR39 and NFR17 language consistently; reference event naming/versioning expectations from architecture (`domain.action`, `schemaVersion` when persisted or queued) without inventing new product requirements.

- [x] **T4 - Verify gates** (AC: 5)  
  - [x] Run full `homeinspection-api` quality gates after doc edits; confirm zero behavioral diff in upload pipeline.

## Dev Notes

### Epic and Story Context

- Story **2.10** closes Epic 2’s **integration & evolution** thread: Phase 1 stays minimal while extension paths stay explicit (FR37–FR39, NFR17).
- **Epic 3 Story 3.1** owns UX/UI backlog traceability (FR40); 2.10 only documents how future HTTP surfaces relate to the existing `v1` upload contract.

### Current Code Baseline (READ BEFORE EDITING)

| Concern | Location |
|--------|-----------|
| Upload HTTP entry | `homeinspection-api/src/modules/report/report.controller.ts` |
| Orchestration, timeout, response mapping | `homeinspection-api/src/modules/report/report.service.ts` |
| Extractor port (symbol + interface) | `homeinspection-api/src/modules/report/extractors/pdf-observation-extractor.port.ts` |
| Default adapter binding | `homeinspection-api/src/modules/report/report.module.ts` (`provide: PDF_OBSERVATION_EXTRACTOR`) |
| Global error envelope | `homeinspection-api/src/common/filters/http-exception.filter.ts` |
| OpenAPI / contract docs | `homeinspection-api/src/openapi/upload.openapi.ts`, `homeinspection-api/openapi/openapi.json` |

Do **not** change upload behavior, DTO shapes, or OpenAPI semantics unless a separate story requires it.

### Architecture Compliance

- **Ports/adapters:** Domain-facing extraction is already behind `PdfObservationExtractor`; future persistence and messaging must remain adapters/modules that **consume** application outcomes—not PDF parsers imported from controllers. [Source: `_bmad-output/planning-artifacts/architecture.md` — layering, report module layout, Phase 2+ persistence module note]
- **Synchronous Phase 1:** No requirement to implement queue consumers; document suggested packaging (`consumers/` or `workers/` inside same deployable) per architecture only.
- **Contract stability:** `POST /v1/report/upload` remains the integration anchor; extension docs must emphasize additive modules and versioning over breaking changes.

### Technical Requirements for This Story

- Deliverables are **Markdown documentation** in-repo (`README.md` + `modules/report/README.md`). Optional: short pointer from `homeinspection-api/docs/api/` index if a natural `docs/api/README.md` or one-line link from `failure-matrix.md` is already justified—**do not** create large new doc trees unless necessary.
- Diagrams are optional; ASCII or Mermaid is acceptable if clarity improves.
- **Forbidden for AC satisfaction:** unused Nest modules for “future DB”, stub `@Injectable()` queue listeners, commented-out AWS clients, or env vars that fail validation if unset.

### Testing Requirements

- No new automated tests are required unless the team adds a **non-brittle** check (e.g. asserting a committed README path exists); default path is **manual review** + green CI.
- Regression suite: existing `npm run test` / `test:e2e` must remain green.

### Previous Story Intelligence (2.9)

- Documentation pattern: developer-facing artifacts live under `homeinspection-api/docs/api/` (e.g. `failure-matrix.md`); README already links Story **2.9** assets—extend README for **2.10** in the same tone (precise paths, no marketing fluff).
- Guardrail tests in `test/app.e2e-spec.ts` enforce doc/fixture alignment for the failure matrix; **do not** couple extension-port docs to brittle e2e string scans unless explicitly valuable.

### Git Intelligence Summary

- Recent Epic 2 commits emphasize **contract determinism** and **docs/fixtures**: OpenAPI alignment (2.8), failure matrix + JSON fixtures + strict matrix/fixture set checks (2.9). Follow the same discipline: docs must reference **real paths** and avoid speculative APIs.

### Latest Technical Information

- NestJS **custom providers** (`Symbol` injection tokens) are already used for `PDF_OBSERVATION_EXTRACTOR`; documenting future ports as additional tokens or wrapper services matches existing patterns—no new framework upgrade required for this story.

### Project Context Reference

- Respect `_bmad-output/project-context.md`: ports/adapters boundaries, no real AWS in tests, env-driven config, no silent contract drift.
- Where project-context still says “framework unresolved,” treat **`architecture.md` + this repo** as overriding for NestJS-specific guidance.

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

- Sprint auto-discovery: first backlog story under Epic 2 after **2-9** → **2-10-documented-extension-ports-for-future-phases**.
- Loaded `epics.md` Story 2.10 ACs, `architecture.md` extension/path notes, `report.module.ts` / `report.service.ts` / extractor port for seam mapping.
- Implemented T1–T4: service README extension section + `src/modules/report/README.md`; full lint/build/test/e2e green; no runtime or dependency changes.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added **Extension ports & future phases** to `homeinspection-api/README.md` with table for persistence, async/events, AI, future HTTP; linked architecture (repo-relative), failure matrix, and module README.
- Added `homeinspection-api/src/modules/report/README.md` with layer map, per-seam attachment guidance (`extractPreview` hook, event names, `schemaVersion`), FR40/Epic 3 pointer, and Phase 1 anti-goals (no AWS/MySQL/consumers/deps for this story).
- Regression: `npm run lint`, `build`, `test`, `test:e2e` all passed; upload pipeline code untouched.

### File List

- `_bmad-output/implementation-artifacts/2-10-documented-extension-ports-for-future-phases.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `homeinspection-api/README.md`
- `homeinspection-api/src/modules/report/README.md`

---

## Change Log

- **2026-05-06:** Story created via `bmad-create-story`; status set to `ready-for-dev`.
- **2026-05-06:** Implemented Story 2.10 documentation; sprint status `ready-for-dev` → `in-progress` → `review`; gates verified green.
- **2026-05-06:** Code review (`bmad-code-review`): clean review (no patch/decision/defer findings); status `review` → `done`.
