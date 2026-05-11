---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
lastStep: 4
status: complete
completedAt: "2026-05-04"
workflowType: epics-and-stories
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/project-context.md
---

# homeinspection - Epic Breakdown

## Overview

This document decomposes the PRD, Architecture, and UX Design Specification into implementable epics and user stories for the Phase 1 inspection PDF upload API (`POST /v1/report/upload`). Epics are ordered for incremental delivery: a governed, observable API shell first, then the extraction value stream, then explicit traceability for deferred UX-heavy work, then a first-party Phase 2 homeowner web client that consumes the stable `v1` contract.

## Requirements Inventory

### Functional Requirements

- FR1: Homeowner users can submit a home inspection report PDF for analysis.
- FR2: API consumer users can upload report files using a standard HTTP file upload request.
- FR3: The system can validate that an uploaded file is a supported PDF input before processing.
- FR4: The system can reject unsupported file types with a structured error response.
- FR5: The system can reject files larger than the allowed size limit with a structured error response.
- FR6: The system can associate each upload request with a unique request context for traceability.
- FR7: The system can parse uploaded home inspection PDFs to identify observation content.
- FR8: The system can associate extracted observations with their corresponding report sections.
- FR9: The system can return extracted observations in a normalized, structured response.
- FR10: The system can handle report structure variability across typical inspection documents.
- FR11: The system can return a deterministic failure response when extraction cannot be completed.
- FR12: The system can preserve partial processing context in error outputs when useful for client recovery.
- FR13: API consumers can receive successful extraction responses in a stable JSON contract.
- FR14: API consumers can receive failure responses in a stable JSON error contract.
- FR15: API consumers can distinguish validation failures from extraction failures through explicit error classification.
- FR16: API consumers can receive actionable error details that support correction and retry.
- FR17: The system can provide consistent response semantics for equivalent request conditions.
- FR18: The system can expose versioned API routes for contract stability.
- FR19: The system can enforce authentication for report upload requests.
- FR20: Prototype operators can use a mocked authentication mode for early-stage validation.
- FR21: The system can enforce request governance through rate limiting within the configured window.
- FR22: API consumers can receive structured feedback when rate limits are exceeded.
- FR23: The system can apply access and usage controls consistently across the upload capability.
- FR24: Prototype maintainers can observe request outcomes across success and failure states.
- FR25: Prototype maintainers can inspect categorized failure reasons for troubleshooting.
- FR26: Prototype maintainers can review request-level processing duration for service behavior tracking.
- FR27: Prototype maintainers can identify recurring error patterns that require corrective action.
- FR28: The system can produce operational telemetry sufficient to assess reliability targets.
- FR29: The system can support iterative quality tuning using observed processing outcomes.
- FR30: Homeowner users can use returned observations as an actionable starting to-do list.
- FR31: Homeowner users can receive output that supports quick orientation to key report concerns.
- FR32: The system can prioritize clarity of extracted output for non-technical homeowners.
- FR33: The product can deliver a complete core workflow within a single interaction cycle (upload to structured observations).
- FR34: The product can provide a useful outcome even when extraction is not perfectly complete.
- FR35: API consumer integrations can be implemented without requiring an SDK.
- FR36: The system can remain backward-compatible within the defined API version scope.
- FR37: The product can preserve extension paths for future persistence capabilities.
- FR38: The product can preserve extension paths for future asynchronous processing capabilities.
- FR39: The product can preserve extension paths for future AI-assisted analysis capabilities.
- FR40: The product can preserve extension paths for future UI-based user access capabilities.

### NonFunctional Requirements

- NFR1: The system shall return either a successful extraction response or a valid structured error response within 30 seconds for supported V1 workloads.
- NFR2: File validation failures (invalid type or size) shall be detected and returned immediately without invoking full extraction processing.
- NFR3: Performance behavior shall remain consistent for typical prototype traffic levels within configured rate limits.
- NFR4: The upload endpoint shall require authentication for all requests, with support for a prototype-safe mocked authentication mode.
- NFR5: The system shall enforce strict file acceptance rules (PDF-only and size limit enforcement) before processing.
- NFR6: The system shall avoid exposing sensitive internal details in public error responses.
- NFR7: The system shall prevent unauthorized access to upload capability through consistent access control enforcement.
- NFR8: The system shall maintain a 99% successful processing rate for valid prototype requests under expected operating conditions.
- NFR9: The system shall return deterministic, structured error responses for all failure paths.
- NFR10: The system shall produce operational records sufficient to diagnose recurring failures and reliability degradation.
- NFR11: Service behavior shall prioritize graceful failure over silent or ambiguous outcomes.
- NFR12: API request and response contracts shall remain stable within the `v1` namespace.
- NFR13: Success and error payloads shall follow deterministic JSON structures suitable for external consumer integration.
- NFR14: Changes to API contracts shall be versioned or otherwise managed to avoid breaking existing integrations unexpectedly.
- NFR15: The system shall enforce configurable rate limiting using a 60-minute governance window to preserve service stability.
- NFR16: The service shall support incremental capacity tuning as prototype usage grows, without requiring contract changes.
- NFR17: The architecture shall preserve a migration path from synchronous-only V1 processing to later asynchronous and persistent workflows.

### Additional Requirements

- Initialize the service using the Architecture-selected starter: `npx @nestjs/cli@latest new homeinspection-api` (first implementation priority).
- TypeScript-first code with ports/adapters: domain and application layers must not import Nest HTTP decorators, AWS SDKs, or PDF libraries directly—use extractor and infrastructure boundaries.
- Environment-driven configuration only (`process.env`); fail fast on missing required variables at bootstrap; provide `.env.example`.
- Version all HTTP routes under `v1`; primary capability is `POST /v1/report/upload` (multipart).
- Synchronous Phase 1 pipeline: validate → extract → respond in one request (no queue in v1).
- Centralized error taxonomy and HTTP mapping; stable JSON error envelope with `requestId` (align field names with OpenAPI).
- OpenAPI as contract source (decorators or committed snapshot); success and error schemas documented.
- Jest for unit tests; integration tests under `test/integration/` with PDF fixtures in `test/fixtures/`; no real cloud calls in CI.
- Pin Node LTS and PDF library choice in manifests when scaffolding completes.
- Docker-friendly single-container deployment story preserved for later hardening.

### UX Design Requirements

- UX-DR1: Publish OpenAPI for `POST /v1/report/upload` with success and error schemas that match runtime JSON (including `requestId` on failures).
- UX-DR2: Publish a narrative failure matrix in docs (validation vs extraction vs rate limit vs auth) with at least one example payload per class.
- UX-DR3: Provide copy-paste or committed fixture JSON for representative success and error responses to support integrator testing (FR35).
- UX-DR4: For a future Phase 2 homeowner client, specify implementation of “Direction 1” calm-neutral observation list: section grouping, badges with text labels, scannable observation rows (defer code until UI epic funded).
- UX-DR5: Error presentation pattern: action-first copy mapping from API `code`, `message`, and `requestId`; include “copy request id” affordance in client specs (defer UI code to Phase 2).
- UX-DR6: Upload UX pattern: visible constraints before upload (PDF-only, 20 MB); bounded-wait messaging during processing (documented for client authors).
- UX-DR7: Persistent disclaimer pattern: output is a starting to-do list, not legal advice or a substitute for the full report (documented for client authors).
- UX-DR8: Accessibility target WCAG 2.2 AA for any first-party UI: document keyboard order, focus visibility, non-color-only status, and live region guidance for async completion (Phase 2).
- UX-DR9: Document responsive breakpoints (`sm`/`md`/`lg`) and mobile-first single-column flow for future observation review UI.
- UX-DR10: When a docs site exists, enforce readable line length (~72ch), heading hierarchy, and code block contrast for developer experience.

### FR Coverage Map

FR1: Epic 2 — Upload path enables homeowner-submitted PDF analysis via API.
FR2: Epic 2 — Standard HTTP multipart upload.
FR3: Epic 2 — PDF validation before extraction.
FR4: Epic 2 — Structured error for bad type.
FR5: Epic 2 — Structured error for oversize file.
FR6: Epic 1 — Request correlation ID on all requests.
FR7: Epic 2 — PDF parsing / observation detection.
FR8: Epic 2 — Section association in response model.
FR9: Epic 2 — Normalized structured success body.
FR10: Epic 2 — Parser variability handling strategy and tests.
FR11: Epic 2 — Deterministic extraction failure responses.
FR12: Epic 2 — Optional partial context in errors when safe.
FR13: Epic 2 — Stable success JSON contract.
FR14: Epic 1 + Epic 2 — Error envelope in foundation; extraction-specific codes in Epic 2.
FR15: Epic 2 — Explicit failure classification in payloads.
FR16: Epic 2 — Actionable error details and messages.
FR17: Epic 1 — Consistent semantics for equivalent conditions (global filter + codes).
FR18: Epic 1 — Versioned `v1` routes and module layout.
FR19: Epic 1 — Auth enforcement on upload route.
FR20: Epic 1 — Mocked auth mode for prototypes.
FR21: Epic 1 — Rate limiting within configured window.
FR22: Epic 1 — Structured rate-limit error response.
FR23: Epic 1 — Consistent guards on upload capability.
FR24: Epic 2 — Logged outcomes for success/failure.
FR25: Epic 2 — Categorized failure reasons in logs/errors.
FR26: Epic 2 — Duration logged per request.
FR27: Epic 2 — Structured fields support pattern analysis.
FR28: Epic 2 — Telemetry sufficient for reliability assessment (logs/metrics baseline).
FR29: Epic 2 — Tunable extraction and logging for iteration.
FR30: Epic 2 — Response shape supports to-do-style consumption.
FR31: Epic 2 — Orientation-friendly grouping and copy.
FR32: Epic 2 — Clear language in default observation text paths.
FR33: Epic 2 — Single request/response cycle for core workflow.
FR34: Epic 2 — Degraded-but-useful behavior documented and tested where applicable.
FR35: Epic 2 — OpenAPI + fixtures without SDK requirement.
FR36: Epic 2 — Contract stability within `v1` (non-breaking additive changes only).
FR37: Epic 2 — Documented extension seams (ports) for persistence.
FR38: Epic 2 — Documented extension seams for async processing.
FR39: Epic 2 — Documented extension seams for AI analysis.
FR40: Epic 3 — Deferred UI access path captured for Phase 2; Epic 4 — first-party homeowner web client (consumes existing `v1` upload API).

NFR coverage: NFR1–NFR3, NFR8–NFR11 primarily Epic 2 stories (timeouts, tests, graceful failure). NFR4–NFR7, NFR15 Epic 1. NFR12–NFR14 Epic 1–2. NFR16–NFR17 Epic 2 (capacity/config) and architecture comments in Epic 2 extension story.

## Epic List

### Epic 1: Governed API foundation

Integrators and operators can deploy a versioned NestJS service with authentication (including mock mode), rate limiting, consistent structured errors, request correlation, and a versioned route shell—establishing trust and safety before extraction logic ships.

**FRs covered:** FR6, FR14 (baseline envelope), FR17–FR23, FR18  
**NFRs primarily addressed:** NFR4, NFR5 (enforcement hooks), NFR6–NFR7, NFR9 (structure), NFR12–NFR15

### Epic 2: Inspection PDF extraction and integration contract

Homeowners (via API clients) and integrators can upload a valid inspection PDF and receive section-linked observations within the SLO, or receive deterministic, classified, actionable errors—backed by tests, fixtures, observability, and documented extension points for future phases.

**FRs covered:** FR1–FR5, FR7–FR16, FR24–FR39, FR30–FR38 (FR40 via handoff to Epic 3 for UI-specific deferral)  
**NFRs primarily addressed:** NFR1–NFR3, NFR8–NFR11, NFR12–NFR14, NFR16–NFR17  
**UX-DRs primarily addressed:** UX-DR1, UX-DR2, UX-DR3, UX-DR6 (documentation for clients), portions of UX-DR5–UX-DR7 as documentation

### Epic 3: Phase 2 UX implementation readiness

Product and engineering have an explicit, traceable backlog checklist that maps UX specification decisions (visual direction, components, accessibility, responsive rules) to future implementation work without expanding Phase 1 API scope.

**FRs covered:** FR40 (extension path for UI)  
**UX-DRs primarily addressed:** UX-DR4, UX-DR5, UX-DR7, UX-DR8, UX-DR9, UX-DR10 (and consolidation of client-facing UX guidance not shipped in Epic 2 docs)

### Epic 4: Phase 2 homeowner web client

Homeowners can upload an inspection PDF through a first-party web client and review section-grouped observations with accessible, responsive UI patterns—using the existing Phase 1 upload API as the only integration surface until an explicit versioning story changes contracts.

**FRs primarily reinforced at UI layer:** FR30–FR32 (clarity and orientation for homeowners consuming extracted output), FR33–FR34 (single-cycle workflow and honest limits as presented in UI copy), FR35 (no SDK required—direct HTTP from browser per integration guidance)  
**NFRs primarily addressed:** NFR1–NFR3 and NFR8–NFR11 **as reflected in client-side wait UX, error handling, and telemetry hooks** (server remains source of truth for timeouts and errors); NFR12–NFR14 respected by not altering `v1` semantics from the UI track alone  
**UX-DRs primarily addressed:** UX-DR4–UX-DR9 in shipped UI; UX-DR10 in published docs chrome when a docs site exists (Story 4.9)

**Planning input:** [`docs/ux-backlog.md`](../../docs/ux-backlog.md); UX Design Specification *Component Strategy*, *Responsive Strategy*, *Accessibility Strategy*.

### Epic 5: AI-assisted observation summary

API consumers can submit **section-grouped observations** (aligned with the existing upload success payload) and receive an **LLM-generated summary and prioritization** for homeowner-oriented clarity—without requiring optional persistence or async phases—using a **Docker-friendly LLM** runtime for local use and **mocked inference** in CI.

**Planning input:** Root [`README.MD`](../../README.MD) Phase 4; [`sprint-change-proposal-2026-05-10.md`](sprint-change-proposal-2026-05-10.md).

**FRs primarily reinforced:** FR39 (AI-assisted analysis path realized); extends homeowner/orientation intent from FR30–FR32 at the API layer.

**NFRs primarily addressed:** NFR4–NFR7 (auth and safe errors), NFR9–NFR11 (deterministic failures/timeouts), NFR12–NFR14 (stable `v1` additive contract), with LLM-specific latency handled via explicit timeouts and structured errors.

---

## Epic 1: Governed API foundation

Operators and integrators get a deployable, observable API shell: NestJS scaffold, configuration discipline, global request IDs, stable error JSON, versioned `v1` routes, authentication with mock mode, and rate limiting—so every later feature inherits the same governance and contract discipline.

### Story 1.1: Scaffold NestJS service from official CLI

As a prototype maintainer,  
I want the repository initialized with the official NestJS CLI starter,  
So that implementation follows the agreed module layout and testing defaults.

**Acceptance Criteria:**

**Given** no existing Nest application in the target package path,  
**When** the developer runs `npx @nestjs/cli@latest new homeinspection-api` (or equivalent documented command) and commits the scaffold,  
**Then** the project builds with `nest build` and starts with `nest start` without errors.  
**And** `package.json` documents Node engine range consistent with Architecture guidance (pin LTS in README or engines field).

### Story 1.2: Environment configuration module and `.env.example`

As a prototype maintainer,  
I want required service settings loaded from environment variables with fail-fast validation,  
So that deployments are explicit and misconfiguration is caught at boot.

**Acceptance Criteria:**

**Given** a missing required environment variable for the Phase 1 subset (e.g. auth mode, rate limit keys as defined in implementation),  
**When** the application boots,  
**Then** startup fails with a clear error naming the missing variable.  
**And** `.env.example` lists all Phase 1 variables with safe placeholder values and comments.

### Story 1.3: Request correlation ID on every HTTP request

As an API consumer,  
I want every response to include or echo a unique request correlation identifier,  
So that I can align logs, support tickets, and client telemetry (FR6).

**Acceptance Criteria:**

**Given** any inbound HTTP request,  
**When** the server completes processing (success or failure),  
**Then** logs for that request include the same correlation id.  
**And** error JSON bodies include `requestId` (or the documented field name from OpenAPI) populated for all error paths handled by the global filter.

### Story 1.4: Global exception filter and stable error JSON envelope

As an API consumer,  
I want failures to return a deterministic JSON structure with code, message, and request context,  
So that clients can parse errors without ad-hoc string matching (FR14, FR17, NFR6, NFR9, NFR13).

**Acceptance Criteria:**

**Given** an unhandled domain or infrastructure error converted to HTTP response,  
**When** the global exception filter serializes the error,  
**Then** the payload matches the documented v1 error schema (stable field names and types).  
**And** stack traces and internal class names are never returned in the client-visible payload (NFR6).

### Story 1.5: Versioned `v1` report route shell

As an API consumer,  
I want the upload capability exposed under a stable versioned path,  
So that integrations can pin to `v1` semantics (FR18, NFR12).

**Acceptance Criteria:**

**Given** the application is running,  
**When** a client issues `POST /v1/report/upload` with valid auth headers (per Story 1.6) but without a file body yet,  
**Then** the route exists and returns a structured validation response (not 404).  
**And** no unversioned upload path is advertised as supported for Phase 1.

### Story 1.6: Authentication guard with mocked prototype mode

As a prototype operator,  
I want authentication enforced on the upload route with a mock-friendly configuration,  
So that we can test locally and in CI without secrets while still proving the guard path (FR19, FR20, NFR4, NFR7).

**Acceptance Criteria:**

**Given** mock auth mode enabled via configuration,  
**When** a request includes the documented mock credential header or token,  
**Then** the request passes the guard.  
**Given** mock auth disabled to simulate production-like behavior,  
**When** a request lacks valid credentials,  
**Then** the API returns 401 with the stable error envelope and `requestId`.

### Story 1.7: Configurable rate limiting for upload route

As a prototype maintainer,  
I want rate limiting applied to the upload endpoint using a 60-minute governance window,  
So that burst traffic cannot destabilize the prototype (FR21–FR23, NFR15, NFR3).

**Acceptance Criteria:**

**Given** a client exceeds the configured request budget within the rolling or fixed window (as implemented),  
**When** they call `POST /v1/report/upload` again,  
**Then** the API returns a structured rate-limit error including classification distinct from validation errors (FR22, FR15).  
**And** limit thresholds are driven by environment variables with sensible defaults documented in `.env.example`.

---

## Epic 2: Inspection PDF extraction and integration contract

Clients can upload home inspection PDFs and receive section-grouped observations suitable as a starting to-do list, or receive fast, explicit validation failures and well-typed extraction failures—all within the latency budget, covered by automated tests and operator-visible telemetry.

### Story 2.1: Multipart upload intake and PDF validation

As an API consumer,  
I want to upload a PDF file with standard multipart encoding and have the service reject bad inputs before extraction,  
So that users get immediate feedback and the system avoids wasted processing (FR2–FR5, FR3, NFR2, NFR5).

**Acceptance Criteria:**

**Given** a request with a non-PDF content type or non-PDF magic bytes,  
**When** `POST /v1/report/upload` is invoked,  
**Then** the API returns a 4xx validation response with structured error classification and no extraction pipeline invocation (NFR2).  
**Given** a file larger than the configured maximum (20 MB per PRD),  
**When** the upload is evaluated,  
**Then** the API rejects with structured oversize error before parsing.  
**Given** a valid PDF under the size limit,  
**When** validation completes,  
**Then** the file buffer or stream is handed to the extraction port without error.

### Story 2.2: Extractor port and PDF library adapter

As an API consumer,  
I want the system to parse PDFs through an isolated adapter behind a domain port,  
So that parsing technology can evolve without coupling business rules to a specific library (FR7, FR10, Architecture ports/adapters).

**Acceptance Criteria:**

**Given** a validated PDF buffer,  
**When** the application service invokes the extractor port,  
**Then** the Nest module depends on an interface in the application/domain layer, not the concrete PDF library type.  
**And** the chosen PDF library is declared in `package.json` with a pinned version recorded in the repo.

### Story 2.3: Section-linked observation response model

As a homeowner (via a client),  
I want observations returned grouped by report section in stable JSON,  
So that I can scan priorities quickly (FR8, FR9, FR13, FR30–FR32, NFR13).

**Acceptance Criteria:**

**Given** a successful extraction,  
**When** the HTTP 200 body is produced,  
**Then** it matches the OpenAPI success schema for `v1` including nested sections and observation entries.  
**And** field naming uses consistent `camelCase` JSON as documented in Architecture.

### Story 2.4: Extraction failure handling with deterministic errors

As an API consumer,  
I want extraction failures to return predictable error codes and messages,  
So that my app can branch retry vs user correction flows (FR11, FR12, FR14–FR16, NFR9, NFR11).

**Acceptance Criteria:**

**Given** the extractor throws or returns an unrecoverable parse state,  
**When** the service maps the failure to HTTP,  
**Then** the client receives the structured error schema with a distinct classification from validation failures (FR15).  
**And** when safe and useful, optional partial context fields are included per FR12 without leaking sensitive internals (NFR6).

### Story 2.5: Processing timeout guard for upload pipeline

As a prototype maintainer,  
I want the upload-to-response path bounded by the SLO,  
So that clients never hang indefinitely (FR33 partial, NFR1, NFR11).

**Acceptance Criteria:**

**Given** extraction exceeds the configured maximum duration (≤30s total budget per PRD for supported workloads),  
**When** the timeout triggers,  
**Then** the API returns a structured timeout error with `requestId` and guidance to retry.  
**And** the implementation ensures validation-only failures still short-circuit without consuming the full extraction budget (NFR2).

### Story 2.6: Automated tests with PDF fixtures

As a prototype maintainer,  
I want integration tests covering success and representative failures using fixture PDFs,  
So that regressions in parsing or validation are caught in CI (FR35, NFR8 baseline automation).

**Acceptance Criteria:**

**Given** fixture PDFs checked into `test/fixtures/` (or generated once deterministically),  
**When** the integration test suite runs,  
**Then** at least one test asserts a successful 200 schema snapshot or structural matcher.  
**And** at least one test each for invalid type, oversize, and extraction failure path asserts correct HTTP status and error classification.  
**And** tests do not call real external cloud services (project-context policy).

### Story 2.7: Structured logging for outcomes and categories

As a prototype maintainer,  
I want each request logged with outcome, category, and timing fields,  
So that I can troubleshoot reliability and spot patterns (FR24–FR27, FR28–FR29, NFR10).

**Acceptance Criteria:**

**Given** any completed upload request,  
**When** logs are written,  
**Then** they include `requestId`, outcome (`success` / `validation_error` / `extraction_error` / etc.), and duration milliseconds.  
**And** log format is JSON or structured enough for log aggregation tools without manual parsing.

### Story 2.8: OpenAPI specification aligned with runtime

As an API consumer,  
I want OpenAPI definitions and examples that match actual responses,  
So that I can integrate without an SDK (FR35, UX-DR1).

**Acceptance Criteria:**

**Given** the implemented controller DTOs and error shapes,  
**When** OpenAPI is generated or updated,  
**Then** `POST /v1/report/upload` documents multipart request, 200 success schema, and all documented error responses with example `requestId` placeholders.  
**And** CI or a documented manual step verifies OpenAPI drift is caught (lint or snapshot) if tooling supports it.

### Story 2.9: Developer-facing failure matrix and fixture JSON

As an API consumer,  
I want a narrative failure matrix and copy-pasteable JSON fixtures,  
So that I can teach my client app how to handle each case (UX-DR2, UX-DR3, FR16).

**Acceptance Criteria:**

**Given** the docs or `docs/api/` markdown committed with the repo,  
**When** a developer reads the failure matrix,  
**Then** they see at least: validation type, validation size, auth failure, rate limit, extraction failure, timeout—with matching example JSON bodies.  
**And** fixture files for success and each error class exist under a documented path (e.g. `test/fixtures/json/`).

### Story 2.10: Documented extension ports for future phases

As a product owner,  
I want clear seams in code and docs for persistence, async, AI, and UI phases,  
So that Phase 1 delivery does not paint us into a corner (FR37–FR39, NFR17).

**Acceptance Criteria:**

**Given** the codebase after Epic 2,  
**When** a reviewer inspects `README` or Architecture-linked module README,  
**Then** they find explicit notes on where persistence, queue publishing, AI enrichment, and future HTTP resources would attach without breaking `v1` upload contract.  
**And** no dormant queue or DB code is required to pass CI for Phase 1.

---

## Epic 3: Phase 2 UX implementation readiness

Teams can plan a future homeowner-facing client without contradicting Phase 1 API scope, by tracing UX specification decisions to concrete future stories and acceptance themes.

### Story 3.1: UX spec traceability backlog for deferred UI

As a product strategist,  
I want UX-DR items that apply only to Phase 2 UI consolidated into an actionable backlog checklist,  
So that sprint planning can pick up UI work without re-deriving UX decisions (FR40, UX-DR4–UX-DR10).

**Acceptance Criteria:**

**Given** the UX Design Specification and epics document,  
**When** the backlog artifact (section in `epics.md` appendix or linked `docs/ux-backlog.md`) is reviewed,  
**Then** each of UX-DR4–UX-DR10 maps to at least one checklist item with suggested future story titles and test notes (accessibility, responsive, design direction reference to `ux-design-directions.html`).  
**And** the checklist explicitly states Phase 1 API remains the system of record; UI is a separate delivery track.

Reference backlog artifact: [`docs/ux-backlog.md`](../../docs/ux-backlog.md).

---

## Epic 4: Phase 2 homeowner web client

Homeowners complete Journey 1–2 from the UX specification through a browser: constrained upload, bounded wait, structured success or error outcomes, and a scannable observation experience—with persistent framing that the output is a starting to-do list, not legal advice. The API remains unchanged unless a dedicated contract/versioning epic alters it; this epic adds **client** capabilities only.

### Story 4.1: Web client scaffold and API integration

As a prototype maintainer,  
I want a dedicated Phase 2 web package with toolchain, environment-based API base URL, and authenticated multipart upload to `POST /v1/report/upload`,  
So that UI stories build on a consistent integration boundary without modifying `homeinspection-api` behavior.

**Acceptance Criteria:**

**Given** Epic 1–2 API is running with documented auth headers for prototype mode,  
**When** a developer starts the web client locally,  
**Then** they can configure base URL and API key (or equivalent prototype auth) via environment variables documented in the web package README.  
**And** the client can submit a valid multipart upload and display raw success JSON or a minimal placeholder results route (refined in later stories).  
**And** no changes to `homeinspection-api` routes or dependencies are required solely for this story beyond optional CORS configuration documented if browsers hit a different origin.

### Story 4.2: Design tokens and responsive layout shell

As a homeowner using phone or desktop,  
I want typography, spacing, and breakpoints aligned to the UX specification (`sm` / `md` / `lg`),  
So that later screens share a coherent Direction 1 baseline.

**Acceptance Criteria:**

**Given** the UX spec *Responsive Strategy* and *Breakpoint Strategy*,  
**When** the app shell renders,  
**Then** layout uses mobile-first single-column defaults and documents breakpoint tokens matching spec numbers.  
**And** design tokens (color, type scale, radii) reference Direction 1 calm-neutral intent with documented overrides where Direction 4 contrast or Direction 5 split layouts apply.

### Story 4.3: Upload flow with pre-flight constraints and bounded-wait messaging

As a homeowner,  
I want visible PDF-only and size constraints before I choose a file, plus clear processing feedback during upload and extraction,  
So that I understand limits and why I may be waiting (UX-DR6).

**Acceptance Criteria:**

**Given** OpenAPI and failure-matrix documented limits (PDF, 20 MB),  
**When** the upload view loads,  
**Then** constraints are shown **before** file picker activation.  
**When** a file is selected or uploading/processing,  
**Then** the UI shows bounded-wait copy consistent with NFR1 expectations without implying guarantees the API does not provide.  
**And** `prefers-reduced-motion` is honored for progress animations.

### Story 4.4: Structured error panel with copy Request ID and live regions

As a homeowner hitting validation, extraction, auth, or rate-limit failures,  
I want action-first messaging mapped from API `code` and `message`, a visible `requestId`, and an easy copy affordance,  
So that I can recover or share diagnostics (UX-DR5, UX-DR8 partial).

**Acceptance Criteria:**

**Given** a structured error envelope from the API,  
**When** an upload fails,  
**Then** the panel presents human-readable guidance derived from `message` and surfaces `code` where helpful.  
**And** `requestId` is readable (not icon-only) with copy-to-clipboard support and screen reader text.  
**And** asynchronous error arrival uses a polite live region pattern without stealing focus inappropriately.

### Story 4.5: Observation list and section grouping (Direction 1 baseline)

As a homeowner with a successful extraction,  
I want observations grouped by section with badges that include text labels and non-color-only status cues,  
So that I can scan results quickly on mobile or desktop (UX-DR4).

**Acceptance Criteria:**

**Given** a success response with sections and observations,  
**When** the results view renders,  
**Then** section headers and observation rows match Direction 1 list density from `ux-design-directions.html` unless an intentional documented deviation exists.  
**And** list semantics support keyboard navigation through observations.  
**And** badge semantics pair icon/color with visible text.

### Story 4.6: Disclaimer strip on first results view

As a homeowner reviewing extracted observations,  
I want a persistent disclaimer that the output is a starting to-do list—not legal advice or a substitute for the full report,  
So that expectations match PRD positioning (UX-DR7).

**Acceptance Criteria:**

**Given** successful extraction is shown,  
**When** the user first reaches the results view in a session (or per product rule documented in the story),  
**Then** a low-emphasis disclaimer strip is visible without hiding primary content.  
**And** optional expanded detail does not bury the only copy of the disclaimer exclusively behind a modal.

### Story 4.7: Responsive polish and optional lg master-detail layout

As a homeowner on tablet or desktop,  
I want layouts that scale to wider breakpoints without horizontal scroll on core flows,  
So that optional master-detail observation browsing matches UX Direction 5 guidance where adopted (UX-DR9).

**Acceptance Criteria:**

**Given** narrowing from desktop to 320px width,  
**When** walking upload → error → success paths,  
**Then** core flows remain usable without horizontal scrolling.  
**At `lg+`,** if master-detail is implemented,  
**Then** focus order remains logical and sticky regions do not trap keyboard focus.

### Story 4.8: WCAG 2.2 AA baseline and automated accessibility checks

As an accessibility-conscious maintainer,  
I want core flows to meet WCAG 2.2 AA targets with automated regression signal,  
So that keyboard, contrast, and focus visibility requirements are sustained (UX-DR8).

**Acceptance Criteria:**

**Given** upload, error, and success views implemented,  
**When** CI runs on the web package,  
**Then** an agreed automated check (e.g. axe) runs against representative pages or components and fails on new serious violations per policy documented in the story.  
**And** manual spot-check guidance (VoiceOver/NVDA) is documented for critical paths.  
**And** focus visibility and contrast meet AA for default theme or documented Direction 4 overrides.

### Story 4.9: Docs readability theme when a docs site ships (UX-DR10)

As an integrator reading published API documentation,  
I want prose width, heading hierarchy, and code block contrast aligned to UX-DR10,  
So that developer docs match readability commitments when a site exists outside Phase 1 markdown-only paths.

**Acceptance Criteria:**

**Given** a docs site generator or theme is chosen (may be stubbed until infra exists),  
**When** long-form pages render,  
**Then** line length targets ~72ch where applicable and headings follow logical order.  
**And** code samples meet contrast guidance for light theme (and dark if supported).  
**If** no docs site is deployed in this epic’s timeframe,  
**Then** this story documents the deferral rationale and leaves theme tokens ready for adoption.

---

## Epic 5: AI-assisted observation summary

Clients send observations produced by Phase 1 extraction (or future persisted reads) to a new **`v1` endpoint** that calls an **LLM** behind an application **port** and returns **structured JSON** (summary + prioritized items). Optional Phase 2 (MySQL) and Phase 3 (async) remain **out of scope** here; when persistence exists later, the same port can gain a repository-backed input adapter without breaking the HTTP contract chosen in this epic.

### Story 5.1: Docker Compose LLM service and documentation

As a prototype maintainer,  
I want a documented way to run an LLM locally alongside the API (for example via Docker Compose),  
So that developers can exercise real inference without relying on CI or external GPUs.

**Acceptance Criteria:**

**Given** the repository documents how to start the LLM service (image, model pull, ports, CPU vs GPU notes),  
**When** a developer follows those steps,  
**Then** they can reach the inference endpoint from the host network using values mirrored in `.env.example`.  
**And** the default CI pipeline is **not** required to start this container (heavy integration remains optional/manual unless explicitly added later).

### Story 5.2: AI summarization port and HTTP adapter

As an API maintainer,  
I want summarization implemented behind a domain/application **port** with an HTTP adapter (OpenAI-compatible or Ollama-style, per decision),  
So that Nest controllers stay thin and LLM wiring stays replaceable and testable.

**Acceptance Criteria:**

**Given** configuration for base URL, model identifier, timeouts, and optional API key via environment variables,  
**When** the application calls the port with normalized observation input,  
**Then** the adapter returns provider errors as typed failures suitable for mapping to the stable error envelope (NFR6, NFR9).  
**And** domain/application layers do not import Nest HTTP types or raw SDK singletons in lieu of the adapter boundary.

### Story 5.3: Prompt and structured LLM output schema

As a homeowner (via an API client),  
I want the model output to **summarize** findings and **prioritize** what to address first in predictable JSON,  
So that clients can render or store results without fragile free-text parsing.

**Acceptance Criteria:**

**Given** validated observation input (sections + observation texts),  
**When** the LLM completes successfully,  
**Then** the service returns a **documented JSON schema** (for example: executive summary string + ordered prioritized items with rationale fields—exact shape recorded in OpenAPI).  
**And** the prompt instructs the model to stay grounded in supplied observations and to avoid inventing findings not present in the input.

### Story 5.4: Versioned summarize endpoint with auth, rate limit, and OpenAPI

As an API consumer,  
I want a **`POST`-style `v1` route** (exact path chosen in implementation—e.g. under `v1/report`) that accepts a JSON body aligned with **`ReportUploadResponseDto` semantics** (`pageCount` + `sections[]` with `sectionName` and `observations[].text`),  
So that I can chain upload → summarize with minimal transformation.

**Acceptance Criteria:**

**Given** Epic 1 guards and rate limiting patterns,  
**When** the new route is called without auth or over quota,  
**Then** responses match existing structured error semantics (`requestId`, classification).  
**Given** valid auth and body,  
**When** summarization succeeds or times out,  
**Then** HTTP status and bodies are documented in OpenAPI alongside upload.  
**And** request/response examples are added to the developer failure matrix or companion docs where upload examples already live.

### Story 5.5: Automated tests with mock LLM and contract coverage

As a prototype maintainer,  
I want CI to verify the summarize route **without** a live LLM,  
So that merges stay reliable and fast.

**Acceptance Criteria:**

**Given** tests substitute a mock/fake implementation of the summarization port,  
**When** the test suite runs in CI,  
**Then** at least one test covers successful structured response parsing/mapping.  
**And** at least one test covers provider failure and timeout mapping to the stable error envelope.  
**And** tests do not require network access to external LLM providers.

---

## Final validation summary

- **Epic 5 additive scope:** AI summarize endpoint and LLM integration (Stories 5.1–5.5) extend API capabilities after Epic 4; FR39 is exercised by delivery rather than “extension path only” documentation.
- **FR coverage:** FR1–FR39 are implemented or explicitly documented in Epic 1–2 stories; FR40 is addressed by Epic 3 Story 3.1 as the UI extension planning hook; FR30–FR35 homeowner and integrator outcomes are **expressed in UI** through Epic 4 where applicable without changing API semantics.
- **NFR coverage:** Addressed via Epic 1 (security, governance, contract shell) and Epic 2 (latency, reliability behavior, observability, contract determinism, evolution notes). NFR8 operational SLO is supported by tests and logging; continuous tuning is expected post-release. Epic 4 reflects SLO and error behavior **in client UX** only.
- **Starter template:** Story 1.1 satisfies Architecture requirement that Nest CLI scaffold is the first implementation story.
- **Story ordering:** No story depends on a later story within its epic; Epic 2 assumes Epic 1 route and governance exist; Epic 4 assumes Epic 1–3 artifacts (`docs/ux-backlog.md`, OpenAPI, failure matrix) remain available.
- **UX-DR coverage:** UX-DR1–UX-DR3 and UX-DR6 covered in Epic 2 documentation stories; UX-DR4–UX-DR5, UX-DR7–UX-DR10 captured in Epic 3 Story 3.1 backlog checklist requirement; UX-DR4–UX-DR9 implemented in Epic 4 UI with UX-DR10 conditioned on docs-site delivery (Story 4.9).
