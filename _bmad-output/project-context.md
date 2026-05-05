---
project_name: 'homeinspection'
user_name: 'kev'
date: '2026-05-01'
sections_completed: ['technology_stack', 'technology_stack_versions', 'language_specific_rules', 'framework_specific_rules', 'testing_rules', 'code_quality_style_rules', 'development_workflow_rules', 'critical_dont_miss_rules']
existing_patterns_found: 4
status: 'complete'
rule_count: 51
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- Runtime/language baseline: Node.js + TypeScript.
- Architecture baseline: single deployable service (modular monolith first); do not split into microservices unless bounded-context triggers are explicitly defined.
- Async messaging target (planned): AWS SQS; local development may use containerized emulation when configured.
- Persistence target (planned): AWS-managed MySQL-compatible service; local development uses Dockerized MySQL when configured.
- Testing baseline: Jest for test execution; Testcontainers for containerized integration tests when integration coverage is required.

- Evidence policy: treat README statements as planning intent unless confirmed by manifests/config/runtime files.
- Version policy: never assume versions; read from `package.json`, lockfiles, Docker configs, and env templates once present.
- Dependency policy: do not introduce new dependencies/versions without updating manifests.

- Unknown until manifests/config exist:
  - Node/TypeScript/Jest/Testcontainers exact versions
  - HTTP framework, AWS SDK variant, DB driver/ORM, migration tool
  - SQS queue type, message schema, retry/backoff/DLQ, idempotency contract
  - MySQL version/charset/collation/timezone/isolation defaults
  - CI container runtime constraints

- Implementation guardrails:
  - Use ports/adapters boundaries; domain/application layers must not directly couple to AWS/MySQL SDKs.
  - Use env-driven configuration only (`process.env`), never hardcoded endpoints/credentials/regions.
  - Test tiers: unit (no network), integration (containers/emulators), optional e2e later.
  - Integration tests must use local emulators/containers, never real AWS services.

## Critical Implementation Rules

### Language-Specific Rules

- TypeScript is required for service code; avoid adding plain JavaScript source files for application logic.
- Prefer strict TypeScript configuration once `tsconfig.json` exists (`strict: true` and no implicit `any` patterns).
- Do not introduce framework-specific global types or decorators unless explicitly chosen in manifests/architecture docs.
- Define explicit types/interfaces at service boundaries (HTTP payloads, queue messages, DB records) rather than using `any`.

- Imports/exports:
  - Prefer explicit named exports for shared modules; avoid default exports in shared internal libraries unless a clear convention is established.
  - Keep import paths stable and non-ambiguous; avoid deep relative traversal when a local alias strategy is defined.
  - Do not import infrastructure SDKs (AWS/MySQL clients) into domain modules.

- Async and error handling:
  - Use `async/await` for async flows; avoid mixed `.then()` chains in new code.
  - Never swallow errors; either handle with context or rethrow typed/domain-meaningful errors.
  - Queue and persistence flows must surface correlation context (message id/file id/request id) in logs/errors.
  - Validate untrusted input at boundaries before type-casting (uploaded file metadata, queue payloads, DB-read externalized data).

- Configuration and secrets:
  - Read runtime configuration from environment variables only; no hardcoded credentials, regions, endpoints, or DSNs.
  - Fail fast on missing required environment variables during startup.

### Framework-Specific Rules

- Framework selection is currently unresolved; do not assume or introduce Express, Fastify, NestJS, or other HTTP frameworks unless explicitly selected in manifests/architecture artifacts.
- Until framework selection is explicit, keep business logic framework-agnostic and organized behind application/service interfaces.
- Define transport adapters (HTTP handler, queue consumer, persistence adapter) as replaceable boundaries; core logic must remain independent of adapter libraries.
- If a framework is introduced later, capture and enforce these conventions in this file:
  - route/controller/module folder layout
  - request validation middleware/pipeline standard
  - error-to-HTTP mapping convention
  - dependency injection/lifecycle pattern (if applicable)
  - logging and correlation-id propagation hooks
- Queue consumer implementation must follow the same boundary rule as HTTP: framework/runtime glue in adapters, business decisions in application/domain services.
- Avoid framework-specific decorators, globals, or lifecycle hooks in shared domain code.
- Any framework-level plugin/middleware choice must include:
  - reason for adoption
  - minimal scope of usage
  - compatibility impact on testing and local emulation

### Testing Rules

- Test tiers are mandatory and must stay separated:
  - Unit: pure business logic, no network/filesystem/cloud calls.
  - Integration: adapters and infrastructure boundaries using local containers/emulators.
  - E2E: optional and added only when end-to-end workflow requirements are explicitly defined.

- Tooling baseline:
  - Use Jest for test runner/assertions.
  - Use Testcontainers for integration tests that require MySQL or queue emulation dependencies.
  - Do not replace test tooling without explicit architecture/update approval.

- Environment policy:
  - Tests must never call real AWS services.
  - Integration tests must run against local Dockerized dependencies/emulators only.
  - Test configuration must come from test-specific env vars; no production credentials or endpoints in tests.

- Data and isolation:
  - Each test must be independent and repeatable; no ordering dependencies.
  - Integration tests must create/seed/cleanup their own data scope.
  - Prefer deterministic fixtures over random data unless randomness is the behavior under test.

- Contract and boundary coverage:
  - Validate queue message schema at producer and consumer boundaries.
  - Validate DB mapping/schema assumptions through integration tests, not unit mocks alone.
  - Cover failure paths explicitly (malformed payloads, missing files, transient dependency failures).

- CI expectations (once CI exists):
  - Unit tests are required for every change.
  - Integration tests run in container-capable CI jobs.
  - Failing tests block merges; no bypass for flaky tests without documented remediation.

### Code Quality & Style Rules

- Keep modules small and single-purpose; prefer composition over large multi-responsibility files.
- Enforce clear layer boundaries:
  - domain/application code must not depend directly on infrastructure SDKs
  - adapters may depend on frameworks/SDKs and translate into domain/application contracts
- Require explicit typing at boundaries; avoid `any`, broad `unknown` casts, and untyped pass-through objects.
- Favor pure functions in domain logic; isolate side effects (I/O, network, clock, randomness) behind interfaces.

- Naming and structure:
  - Use descriptive, intention-revealing names (e.g., `enqueueInspectionFile`, `parseObservations`).
  - Keep naming consistent across command/query flows (`create*`, `get*`, `process*`, `validate*`).
  - Co-locate tests near modules or in a mirrored structure; keep one clear convention once selected.

- Error and logging quality:
  - Errors must be actionable and contextual (operation, identifier, dependency).
  - Log with correlation identifiers (request id, file id, message id) for async traceability.
  - Never log secrets, credentials, or full sensitive payloads.

- Documentation and comments:
  - Comment only non-obvious intent, invariants, or trade-offs; avoid redundant comments.
  - Document boundary contracts (payload schemas, env vars, retry semantics) close to implementation.
  - Keep README/docs aligned with actual behavior when adding/changing capabilities.

- Lint/format policy:
  - Once lint/format tooling is added, agents must follow it exactly and not introduce conflicting style rules.
  - Treat lint/type errors as blocking for completion of a change.

### Development Workflow Rules

- Treat planning artifacts as source-of-truth constraints:
  - `_bmad-output/project-context.md` governs agent implementation behavior.
  - When PRD/architecture/epics are created, agents must align implementation choices to those artifacts and update context when rules change.

- Git and change hygiene:
  - Keep changes scoped and reviewable; avoid mixing unrelated concerns in one change set.
  - Do not commit generated noise or local-only machine artifacts.
  - Never commit secrets, credentials, or environment files containing sensitive values.

- Branching/commit conventions (until explicit team policy exists):
  - Use short-lived branches with purpose-revealing names.
  - Use clear commit messages that explain intent and impact, not just file-level edits.
  - Rebase/merge strategy should follow repo policy once defined; do not assume force-push workflows.

- PR expectations:
  - PR descriptions must include: what changed, why, risk areas, and test evidence.
  - Highlight assumptions made due to missing manifests/config and call out follow-up tasks.
  - Block merge when required tests or lint/type checks fail.

- Environment and deployment workflow:
  - Development and test workflows must be reproducible locally with Dockerized dependencies.
  - Production-target assumptions (AWS services, network/security setup) remain provisional until infra definitions are committed.
  - Any change that impacts deploy/runtime configuration must include corresponding env/config documentation updates.

- Traceability:
  - For async pipeline changes, include end-to-end trace narrative: upload -> queue -> consumer -> database -> API response.
  - Maintain explicit schema/version notes for messages and persisted data when contracts evolve.

### Critical Don't-Miss Rules

- Do not treat planning statements as implemented facts.
  - README and early artifacts describe intent; always verify in code/manifests before coding against assumptions.
  - Mark unresolved choices explicitly (framework, SDK, ORM, migration tooling, queue semantics).

- Do not bypass architectural boundaries.
  - Never couple domain logic directly to AWS SDK/MySQL driver/framework internals.
  - Keep transport/infrastructure concerns in adapter layers.

- Do not call real cloud services in tests or local development by default.
  - Use local Dockerized dependencies/emulators for integration testing.
  - Fail fast if environment points tests to production-like endpoints.

- Do not leave async processing non-idempotent.
  - Queue consumers must handle duplicate deliveries safely.
  - Preserve correlation identifiers across upload, queue, consumer, and persistence flows.

- Do not accept silent contract drift.
  - Message payloads and DB schemas must be versioned/validated at boundaries.
  - Contract changes require corresponding test updates and documentation updates.

- Do not swallow operational failures.
  - Surface actionable errors for parse failures, queue failures, DB failures, and invalid input.
  - Add retry/backoff behavior only with explicit bounds and dead-letter/failure handling strategy.

- Security gotchas to always avoid:
  - No hardcoded credentials/secrets/connection strings.
  - No logging of sensitive payload content.
  - Validate and constrain uploaded file handling (size/type/path) before processing.

- Performance and reliability gotchas:
  - Avoid loading large PDFs fully into memory when streaming/chunking is viable.
  - Avoid N+1 or row-by-row persistence loops when batch-safe patterns are available.
  - Ensure timeouts are explicit for network/DB/queue operations; no unbounded waits.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code.
- Follow all rules exactly as documented.
- When in doubt, prefer the more restrictive option.
- Update this file if new project-specific patterns emerge.

**For Humans:**

- Keep this file lean and focused on agent needs.
- Update when technology stack assumptions become concrete or change.
- Review periodically and remove rules that are no longer useful.
- Keep this file aligned with PRD, architecture, and implementation artifacts.

Last Updated: 2026-05-01
