---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/project-context.md
workflowType: 'architecture'
project_name: 'homeinspection'
user_name: 'kev'
date: '2026-05-04'
lastStep: 8
status: 'complete'
completedAt: '2026-05-04'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The PRD defines 40 functional requirements centered on one Phase 1 capability: ingest a home inspection PDF, extract section-linked observations, and return structured output. Architecturally, this implies clear boundaries across request intake, file validation, extraction orchestration, parsing logic, response shaping, and error classification. Requirements also establish versioned API behavior, mocked-but-consistent authentication, rate-limited usage control, deterministic contract semantics, and observability for operators.

**Non-Functional Requirements:**
NFRs primarily constrain architecture around response time (<=30s), reliability (99% for valid prototype requests), deterministic error handling, stable `v1` integration contracts, security controls for upload handling, and configurable rate limiting over a 60-minute governance window. These NFRs push toward explicit timeout boundaries, robust failure typing, and strong input boundary validation.

**Scale & Complexity:**
This is a deliberately constrained MVP with phased expansion paths preserved.

- Primary domain: API/backend
- Complexity level: low-to-medium (low product scope, medium parsing/contract reliability risk)
- Estimated architectural components: 6-8 core components (API adapter, auth/rate-limit middleware, upload validation, extraction service, parser adapter, response/error mapper, observability hooks, config module)

### Technical Constraints & Dependencies

- TypeScript-first service code with explicit typed boundaries.
- NestJS is the HTTP framework; domain-oriented logic stays behind ports so core parsing/extraction rules are not coupled to Nest decorators or HTTP details.
- Ports/adapters boundary required: domain/application cannot couple directly to infra SDKs.
- Environment-driven config only (`process.env`), fail-fast for missing required settings.
- No real cloud calls in tests; local/containerized dependencies only.
- MVP is synchronous-only for upload/extract/respond; async queue + persistence are future phases but must remain architecturally reachable.
- API contract stability for `v1` required from first release.

### Cross-Cutting Concerns Identified

- Input validation and safe file handling (type/size/path constraints).
- Error taxonomy and deterministic client-facing error schema.
- Authentication and request governance (mockable auth + rate limiting).
- Observability and traceability (request IDs, categorized failure telemetry).
- Boundary enforcement to prevent implementation leakage into domain logic.
- Evolvability for later persistence, queue processing, and AI features without core rewrites.

## Starter Template Evaluation

### Primary Technology Domain

`api_backend` based on project requirements analysis.

### Starter Options Considered

- **NestJS official CLI starter** (`@nestjs/cli`)
  - Mature and actively maintained official ecosystem.
  - Strong TypeScript defaults, module boundaries, and test setup.
  - Supports Express default or Fastify adapter if needed later.
- **Fastify TypeScript starters** (community generators and templates)
  - High performance and lighter footprint.
  - Good options exist, but quality and conventions vary across community templates.
- **Express TypeScript starters** (community templates)
  - Broad choice, many actively maintained options.
  - More manual architecture discipline needed to maintain consistent modular boundaries.

### Selected Starter: NestJS official CLI starter

**Rationale for Selection:**
For this project, NestJS gives the strongest structured default for consistent AI-assisted implementation: clear modular organization, strong TypeScript patterns, built-in testing conventions, and easy evolution path for later phases (persistence, queue consumers, and AI endpoints). It best fits the need for predictable architecture decisions early.

**Initialization Command:**

```bash
npx @nestjs/cli@latest new homeinspection-api
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript-first Node.js service with Nest module/controller/service structure.

**Styling Solution:**
Not applicable for backend service starter (no frontend styling layer).

**Build Tooling:**
Nest CLI standard build and run workflow with environment-based config support.

**Testing Framework:**
Jest-based testing scaffold and default unit-test structure.

**Code Organization:**
Feature/module-oriented backend structure with explicit boundaries and dependency-injection patterns.

**Development Experience:**
Hot-reload friendly dev workflow, lint/test scaffolding, consistent project conventions.

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- NestJS-based API service architecture with strict TypeScript boundaries.
- REST API contract with versioned `v1` routes and deterministic response/error schema.
- Synchronous Phase 1 processing model (upload -> validate -> extract -> respond).
- Boundary-first validation, security controls, and request governance (auth + rate limiting).

**Important Decisions (Shape Architecture):**
- Ports/adapters layering to keep domain/application independent of framework and infrastructure details.
- Structured observability with request correlation and categorized failure tracking.
- OpenAPI-based contract documentation for external consumers.
- Environment-driven configuration with fail-fast startup validation.

**Deferred Decisions (Post-MVP):**
- Persistence schema and migration strategy (Phase 2).
- Queue topology and async worker execution strategy (Phase 3).
- AI inference service integration and model orchestration approach (Phase 3).
- UI architecture and frontend stack decisions (Phase 3).

### Data Architecture

- Phase 1 data flow is stateless and request-scoped; no persistent storage in runtime path.
- DTO-first contracts for upload input, extraction output, and error payloads.
- Validation performed at boundaries before domain-level processing.
- Persistence modeling and migrations deferred until Phase 2 introduces MySQL-backed storage.

### Authentication & Security

- Lightweight API-key style authentication via Nest guards/middleware, mock-capable for prototype use.
- Single-role authorization model for Phase 1; no RBAC matrix required yet.
- Strict file upload constraints (PDF-only, max 20 MB, bounded processing path).
- Sanitized client-facing errors to avoid leaking internal details.
- Security controls applied consistently at API ingress points.

### API & Communication Patterns

- REST over HTTP with `POST /v1/report/upload` as primary Phase 1 endpoint.
- Stable JSON response envelope conventions for success and error paths.
- Explicit error taxonomy to separate validation, parsing, and internal failures.
- OpenAPI/Swagger contract publishing for API consumer integrations.
- No inter-service messaging in Phase 1; single deployable service.

### Frontend Architecture

- Not applicable for Phase 1 (API-first MVP with no bundled UI).
- Architecture retains extension points for Phase 3 UI introduction without contract-breaking API changes.

### Infrastructure & Deployment

- Single containerized backend deployment model, environment-driven configuration.
- CI baseline: lint, type-check, unit tests, build validation.
- Structured logging with request IDs and outcome classification.
- Vertical scaling first; horizontal stateless scaling when load warrants it.

### Decision Impact Analysis

**Implementation Sequence:**
1. Initialize NestJS service scaffold.
2. Establish project structure and consistency patterns.
3. Implement ingress controls (auth, validation, rate limiting, request context).
4. Implement extraction flow and deterministic response contracts.
5. Add observability and error categorization.
6. Validate against FR/NFR success criteria.

**Cross-Component Dependencies:**
- Validation and error taxonomy decisions shape both controller and extraction service contracts.
- Auth and rate limiting choices constrain ingress middleware and API documentation.
- Response schema stability governs integration compatibility and future phase extensibility.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical conflict points identified:** 8 areas where different agents could diverge without explicit rules: JSON field casing, error envelope shape, route naming under `v1`, log field names, test placement, module vs feature folder ownership, where PDF parsing lives, and where env validation lives.

### Naming Patterns

**Database naming conventions (Phase 2+):**
- Tables: plural `snake_case` (e.g. `observations`).
- Columns: `snake_case` (e.g. `section_name`, `created_at`).
- Foreign keys: `{referenced_table_singular}_id` where practical.
- Indexes: `idx_{table}_{columns}`.

**API naming conventions:**
- Base path: `/v1`.
- Phase 1 upload route: `POST /v1/report/upload` (fixed contract per PRD).
- Future routes: kebab-case path segments, plural resource collections when listing (e.g. `/v1/observations` when added).
- Query parameters: `camelCase`.
- Custom headers: avoid `X-` prefix unless required for compatibility; prefer conventional names (e.g. `Authorization`, `X-Request-Id` only if client ecosystem demands).

**Code naming conventions:**
- TypeScript types/classes: `PascalCase`.
- Functions, variables, methods: `camelCase`.
- Constants and env keys in code: `UPPER_SNAKE_CASE` for env names as read from `process.env`; internal config object keys `camelCase`.
- Nest files: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.guard.ts`, `*.interceptor.ts`, `*.pipe.ts` suffixes.

### Structure Patterns

**Project organization:**
- Feature modules under `src/modules/<feature>/` (controller, module, services, DTOs, and feature-specific adapters such as PDF parsing).
- Cross-cutting Nest building blocks (global exception filter, logging interceptor, auth guard) under `src/common/` (or `src/core/` if preferred, but use one folder name repo-wide).
- Shared primitives (result types, error codes enum, branded IDs) under `src/shared/`.
- Typed configuration assembly under `src/config/`.
- Future queue consumers live in `src/modules/<feature>/consumers/` or a dedicated `src/workers/` package within the same deployable — decide at Phase 3 without moving Phase 1 contracts.

**File structure patterns:**
- `.env.example` at repo root listing required vars without secrets.
- OpenAPI artifact or decorator-driven spec colocated with HTTP module or under `src/docs/`.
- PDF fixtures for tests under `test/fixtures/pdfs/` (or `test/fixtures/reports/`).

### Format Patterns

**API response formats:**
- Success: single top-level JSON object with stable fields (no ad hoc wrapping); document field order only where clients depend on readability, not as a runtime guarantee.
- Errors: stable envelope `{ "error": { "code", "message", "details?", "requestId" } }` (exact keys fixed in OpenAPI).
- HTTP status: 4xx for client/validation errors; 5xx for server errors; avoid using 200 with embedded error payloads.

**Data exchange formats:**
- JSON property names: `camelCase`.
- Booleans: JSON `true` / `false` only.
- Date/time: ISO-8601 UTC strings.
- Nulls: omit optional fields when absent; use `null` only when the field is explicitly nullable by contract.

### Communication Patterns

**Event system patterns (Phase 3+):**
- Event names: dot-lower `domain.action` (e.g. `report.uploaded`, `report.extractionFailed`).
- Payloads: versioned with `schemaVersion` when persisted or queued.

**Logging patterns:**
- Structured logs (JSON) with at minimum: `level`, `message`, `timestamp`, `requestId`, `errorCode` (when applicable), `durationMs` (when applicable).
- Never log raw file bytes or secrets.

### Process Patterns

**Error handling patterns:**
- Map domain and infrastructure failures to the public error taxonomy at the HTTP boundary only.
- Nest exception filters centralize mapping; controllers do not construct arbitrary error shapes.

**Loading / long-running request patterns:**
- Single request timeout budget aligned with NFR (30s end-to-end for extraction path).
- Return structured timeout errors when exceeded.

### Enforcement Guidelines

**All AI agents MUST:**
- Keep `POST /v1/report/upload` contract stable unless versioning changes.
- Place PDF parsing and extraction behind an application port interface; implement parser in an adapter module.
- Validate uploads before invoking extraction; enforce 20 MB and PDF checks at boundary.
- Add or update OpenAPI when request/response shapes change.

**Pattern enforcement:**
- CI runs lint, typecheck, unit tests; optional integration job when Testcontainers tests exist.
- PR review checks: error envelope consistency, no new env reads without `.env.example` update.

### Pattern Examples

**Good examples:**
- Controller delegates to `ReportService` (or `ExtractObservationsUseCase`); service depends on `PdfObservationExtractor` port; adapter implements port in `modules/report/extractors/`.
- Validation error returns `error.code` = `VALIDATION_FAILED` with field-level `details`.

**Anti-patterns:**
- Parsing PDFs directly inside a Nest controller method.
- Returning different error JSON shapes for the same failure class.
- Importing AWS SDK or DB drivers from domain or application folders (Phase 2+).

## Project Structure & Boundaries

### Complete project directory structure

```
homeinspection-api/
├── package.json
├── package-lock.json
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── .env
├── .env.example
├── .gitignore
├── README.md
├── Dockerfile
├── docker-compose.yml
├── .github/
│   └── workflows/
│       └── ci.yml
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   │   ├── configuration.ts
│   │   └── env.validation.ts
│   ├── common/
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── guards/
│   │   │   └── api-key.guard.ts
│   │   ├── interceptors/
│   │   │   ├── request-id.interceptor.ts
│   │   │   └── logging.interceptor.ts
│   │   └── middleware/
│   │       └── rate-limit.middleware.ts
│   ├── shared/
│   │   ├── errors/
│   │   │   └── error-codes.ts
│   │   └── types/
│   │       └── api-response.types.ts
│   └── modules/
│       └── report/
│           ├── report.module.ts
│           ├── report.controller.ts
│           ├── report.service.ts
│           ├── dto/
│           │   ├── upload-report.dto.ts
│           │   └── extraction-response.dto.ts
│           ├── extractors/
│           │   ├── pdf-observation-extractor.port.ts
│           │   └── pdf-observation-extractor.adapter.ts
│           └── report.service.spec.ts
├── test/
│   ├── fixtures/
│   │   └── pdfs/
│   │       └── README.md
│   └── integration/
│       └── report-upload.e2e-spec.ts
└── openapi/
    └── README.md
```

### Architectural boundaries

**API boundaries**

- **External:** `POST /v1/report/upload` only in Phase 1; all traffic enters `ReportController`.
- **Ingress:** guards (auth), middleware/interceptors (request id, logging), global exception filter maps failures to the public error envelope.
- **Application:** `ReportService` orchestrates validate → extract → map response; no PDF libraries imported in the controller.

**Component boundaries**

- **Presentation:** Nest controllers + DTOs under `modules/report/`.
- **Application logic:** orchestration in `ReportService` (split into dedicated use-case classes later if needed without changing the route).
- **Infrastructure:** PDF extraction implements `PdfObservationExtractor` port in `extractors/`; swap implementation without changing the HTTP contract.

**Data boundaries**

- **Phase 1:** no database; no ORM. In-memory handling for the lifetime of the request only.
- **Phase 2+:** persistence adapters live in a dedicated module (e.g. `modules/observations/` or `modules/persistence/`), not inside the core extraction orchestration.

### Requirements to structure mapping

**FR category → location**

- **Document ingestion (FR1–FR6):** `modules/report/report.controller.ts`, `dto/upload-report.dto.ts`, guards/middleware under `common/`.
- **Observation extraction (FR7–FR12):** `modules/report/report.service.ts`, `extractors/*`.
- **API response contracts (FR13–FR18):** DTOs, global filter, OpenAPI (decorators or `openapi/` snapshot).
- **Access control & governance (FR19–FR23):** `common/guards`, `common/middleware`, `config/` for rate-limit and auth env.
- **Reliability & ops (FR24–FR29):** `common/interceptors`, structured logging in `main.ts` bootstrap.
- **Homeowner value (FR30–FR34):** extraction output shaping in `report.service` + response DTOs.
- **Integration & evolution (FR35–FR40):** ports under `extractors/`; `v1` route prefix; extension modules added without breaking existing contracts.

**Cross-cutting**

- **Errors:** `shared/errors`, `common/filters`.
- **Config:** `config/`.

### Integration points

**Internal:** Controller → service → extractor port → adapter; filters/guards wrap the pipeline.

**External:** HTTP clients only; PDF parsing library is the main third-party dependency for Phase 1 (choice recorded at implementation time).

**Data flow:** Multipart upload → validation → extractor reads buffer/stream → structured observations DTO → JSON response.

### File organization patterns

- **Config:** `src/config/` + root `.env.example`.
- **Source:** `src/modules/<feature>/`, `src/common/`, `src/shared/`.
- **Tests:** unit `*.spec.ts` next to files; integration under `test/integration/` with fixtures in `test/fixtures/`.

### Development workflow integration

- **Dev:** `nest start --watch`.
- **Build:** `nest build`; Docker image for repeatable runs.
- **Deploy:** single container; env from platform secret store.

## Architecture Validation Results

### Coherence validation

**Decision compatibility:** NestJS REST service, stateless Phase 1 flow, ports-based PDF extraction, centralized error mapping, and env-driven config fit together. No contradiction with phased roadmap (sync first, persistence/queue/AI later).

**Pattern consistency:** Naming (`camelCase` JSON, stable error envelope), structure (feature module + `common` + `shared`), and boundaries (controller thin, extractor behind port) align with core decisions.

**Structure alignment:** Directory tree places ingress concerns in `common/`, extraction in `modules/report/extractors/`, and config in `config/`, matching FR clusters and NFRs (timeouts, observability, rate limits).

### Requirements coverage validation

**Epic/feature coverage:** No epics document loaded; coverage is traced from PRD FR categories and NFRs instead.

**Functional requirements coverage:** FR1–FR40 are mappable to `report` module, `common` cross-cutting, and `config`. Phase 2–4 items are explicitly deferred with extension points (ports, new modules).

**Non-functional requirements coverage:** Performance (30s budget), security (upload constraints + auth guard), reliability (structured errors + ops logging hooks), integration (stable `v1` + OpenAPI), and scalability (rate limit + stateless service) are all reflected in decisions, patterns, or structure.

### Implementation readiness validation

**Decision completeness:** Critical path is documented. Remaining implementation choices (exact PDF library, Node engine version in `package.json`/`.nvmrc`) should be fixed in the first implementation story, not left implicit.

**Structure completeness:** Concrete tree and integration points are specified for Phase 1.

**Pattern completeness:** Major conflict areas covered; examples align with the `extractors/` layout.

### Gap analysis results

**Important gaps**

- Pin **Node.js LTS** (engines field + CI matrix) when the repo is initialized.
- Select and record the **PDF parsing library** and document constraints (memory, malformed PDF behavior) in the first extraction story.

**Nice-to-have gaps**

- Add an explicit **OpenAPI** generation strategy (code-first decorators vs checked-in `openapi/` snapshot) in the first API story.
- Add **load/soak test** notes post-prototype if 99% SLO is validated empirically.

### Validation issues addressed

- Resolved internal doc drift: project context analysis states NestJS as the HTTP layer while keeping domain logic port-based.

### Architecture completeness checklist

**Requirements analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural decisions**

- [ ] Critical decisions documented with versions (Node LTS + PDF library versions still to pin at repo init)
- [x] Technology stack direction specified (NestJS + TypeScript + Jest baseline)
- [x] Integration patterns defined (REST, OpenAPI intent, single service)
- [x] Performance considerations addressed (30s budget, validation short-circuit)

**Implementation patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified (logging, future events)
- [x] Process patterns documented (errors, timeouts)

**Project structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture readiness assessment

**Overall status:** READY WITH MINOR GAPS (one checklist item open until Node + PDF dependency versions are pinned in the implementation repo)

**Confidence level:** high for Phase 1 shape; medium until PDF parser choice is validated against real reports

**Key strengths:** single bounded context, explicit Phase 1 scope, strong agent consistency rules, clear extension path for Phases 2–3

**Areas for future enhancement:** persistence module layout, queue consumer packaging, AI adapter boundary

### Implementation handoff

**AI agent guidelines**

- Follow architectural decisions and patterns in this document.
- Respect module boundaries and the `POST /v1/report/upload` contract.
- Pin versions and library choices in code manifests when the project is scaffolded.

**First implementation priority**

```bash
npx @nestjs/cli@latest new homeinspection-api
```
