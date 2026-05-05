# Story 1.2: Environment configuration module and `.env.example`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **prototype maintainer**,  
I want **required service settings loaded from environment variables with fail-fast validation**,  
So that **deployments are explicit and misconfiguration is caught at boot**.

## Acceptance Criteria

1. **AC1 — Fail-fast on missing required env**  
   **Given** a required Phase-1 configuration variable for this story’s validation rules is unset (for example `AUTH_MODE` is absent or empty),  
   **When** the Nest application bootstraps (`NestFactory.create` / module initialization completes for `AppModule`),  
   **Then** startup **throws or exits** before the HTTP server begins listening (no silent default for that variable).  
   **And** the thrown error or logged fatal message **names the missing or invalid variable** (human-readable; exact wording is implementation-defined but must include the env key).

2. **AC2 — Typed configuration surface**  
   **Given** the service reads tunable settings from configuration (not scattered raw `process.env` reads in feature code for keys covered by this story),  
   **When** a developer inspects the config layer,  
   **Then** there is a dedicated **`src/config/`** assembly aligned with Architecture (`configuration.ts` + `env.validation.ts` or equivalent split),  
   **And** `AppModule` imports **`ConfigModule`** from `@nestjs/config` so config is available application-wide (`isGlobal: true` recommended).

3. **AC3 — `.env.example` documents Phase 1 variables**  
   **Given** a new developer clones the repository,  
   **When** they open **`.env.example` inside `homeinspection-api/`** (same directory as `package.json`, where `npm run start:*` runs),  
   **Then** every environment variable that this story’s validation treats as required **or optional with documented defaults** for Phase 1 governance (auth + rate limiting placeholders for Stories 1.6–1.7) appears **once**, with a **safe placeholder value** and a **short comment** describing purpose.  
   **And** no real secrets or production API keys appear in the example file.

4. **AC4 — Local dev ergonomics**  
   **Given** `.env` files remain git-ignored,  
   **When** the developer copies `.env.example` → `.env` inside `homeinspection-api/` and fills placeholders (or exports equivalent vars in the shell),  
   **Then** `npm run build` and `npm run start:dev` still succeed (same as Story 1.1 baseline),  
   **And** root / nested `.gitignore` rules continue to exclude `.env` and local env variants (do not regress Story 1.1 hygiene).  
   **Note:** A fresh clone **without** `.env` / exported vars **should** fail validation until configured — that is expected fail-fast behavior (AC1), not a regression.

5. **AC5 — Tests prove validation**  
   **Given** automated tests for the validation layer,  
   **When** a required variable is omitted or set to an illegal value,  
   **Then** at least one **unit test** fails the expectation if validation incorrectly allows boot,  
   **And** `npm run test` and `npm run lint` remain green for the final implementation.

## Tasks / Subtasks

- [x] **T1 — Dependency and module wiring** (AC: 2, 4)  
  - [x] Add **`@nestjs/config`** to `homeinspection-api/package.json` (lockfile updated via `npm install`). Prefer a **4.x** line compatible with Nest **11**; pin to a specific caret range the team accepts.  
  - [x] Import **`ConfigModule.forRoot({ ... })`** in `homeinspection-api/src/app.module.ts` with **`isGlobal: true`**, explicit **`envFilePath`** (e.g. `['.env.local', '.env']` relative to `homeinspection-api/`), and a **`validate`** function (or `validationSchema` if you choose Joi) invoked during config module initialization.  
  - [x] Do **not** add Joi/Zod unless you need them; a typed **`validateEnv`** in `env.validation.ts` that throws **`Error` with env key names** is sufficient if it satisfies AC1.

- [x] **T2 — `src/config` implementation** (AC: 1, 2)  
  - [x] Add **`homeinspection-api/src/config/configuration.ts`**: export a factory (or `registerAs`) that maps **UPPER_SNAKE_CASE** `process.env` keys to a **`camelCase`** typed config object consumed by the rest of the app (Architecture naming: env keys `UPPER_SNAKE_CASE`, internal keys `camelCase`).  
  - [x] Add **`homeinspection-api/src/config/env.validation.ts`**: validate the **subset required for this story**, including at minimum:  
    - **`AUTH_MODE`**: required; allowed values exactly **`mock`** | **`live`** (strings).  
    - **When `AUTH_MODE=mock`**: require non-empty **`MOCK_AUTH_HEADER_NAME`** and **`MOCK_AUTH_HEADER_VALUE`** (prototype header credentials).  
    - **When `AUTH_MODE=live`**: require non-empty **`API_KEYS`** (comma-separated list allowed; document format in `.env.example`).  
    - **`PORT`**: optional; if set, must parse to an integer **1–65535**; if unset, default **3000** in typed config (bootstrap may keep `?? 3000` or read from `ConfigService`—pick one consistent approach).  
    - **`NODE_ENV`**: optional; default `development` if unset.  
    - **Rate limit placeholders (optional values, validate format when present):** `RATE_LIMIT_WINDOW_MINUTES` (positive integer, default **60** if unset) and `RATE_LIMIT_MAX_REQUESTS` (positive integer, default **100** if unset) for Story 1.7.  
  - [x] On any validation failure, throw a single error whose **message lists offending keys** (AC1).

- [x] **T3 — Bootstrap alignment** (AC: 1, 2, 4)  
  - [x] Update **`homeinspection-api/src/main.ts`** to obtain listen **port** from **`ConfigService`** (inject after `NestFactory.create`) **or** document why `ConfigModule` loads before `listen` and `PORT` is still read from `process.env` only—prefer **ConfigService** for consistency.  
  - [x] Ensure **`void bootstrap();`** pattern and lint cleanliness are preserved.

- [x] **T4 — `.env.example` and docs** (AC: 3, 4)  
  - [x] Create **`homeinspection-api/.env.example`** with all keys from T2, grouped by concern (core / auth / rate limit), comments, and **obviously fake** placeholder values.  
  - [x] Update **`README.MD`** at repo root **or** `homeinspection-api/README.md` (pick the place operators read first—at least one) with **copy instructions**: `cp .env.example .env` from `homeinspection-api/`, then adjust values.

- [x] **T5 — Tests** (AC: 5)  
  - [x] Add **`homeinspection-api/src/config/env.validation.spec.ts`** (or colocated pattern matching project tests) covering: missing `AUTH_MODE`; illegal enum; mock mode missing mock headers; live mode missing `API_KEYS`; invalid `PORT` when set.  
  - [x] Run **`npm run test`**, **`npm run test:e2e`**, **`npm run lint`**, **`npm run build`** from `homeinspection-api/` and record results in Dev Agent Record.

## Dev Notes

### Architecture compliance (must follow)

- **Config location:** Typed configuration assembly lives under **`src/config/`** with **`configuration.ts`** and **`env.validation.ts`** (names match Architecture tree). [Source: `_bmad-output/planning-artifacts/architecture.md` — “Project Structure & Boundaries”, `config/` entries]

- **`.env.example` placement:** Architecture’s **directory tree** shows **`.env.example` next to the Nest app** (`homeinspection-api/`). Treat **`homeinspection-api/.env.example`** as canonical for this monorepo (developers `cd homeinspection-api` per Story 1.1 README). An earlier prose line says “repo root”; for this layout, **application package root** = `homeinspection-api/`. If you also mirror a pointer at the monorepo root, keep a **single source of truth** in `homeinspection-api/.env.example` to avoid drift.

- **Env-driven only:** No hardcoded credentials, regions, or endpoints; fail fast on missing required settings. [Source: `architecture.md` — ADR-style bullets; `epics.md` — Additional Requirements]

- **Naming:** Env vars **`UPPER_SNAKE_CASE`**; internal config object keys **`camelCase`**. [Source: `architecture.md` — “Code naming conventions”]

- **Do not implement in 1.2:** Global exception filter (1.4), correlation ID interceptor (1.3), auth **guard** behavior (1.6), rate limit **middleware** (1.7), upload route (1.5 / Epic 2). This story only establishes **config loading + validation + documentation** so later stories read **`ConfigService`** or injected config tokens instead of ad hoc `process.env`.

### Epic / PRD traceability

- **Epic 1 Story 1.2** acceptance criteria are the source of truth for BDD statements above. [Source: `_bmad-output/planning-artifacts/epics.md` — Story 1.2]

- **Phase 1 subset:** Epics cite “auth mode, rate limit keys as defined in implementation”—the variable names in **T2** are the contract for Stories **1.6** (auth) and **1.7** (rate limiting); adjust only if you update `.env.example` and validation **together**.

### Library / framework requirements

- **`@nestjs/config`**: Official Nest configuration module; use **`ConfigModule.forRoot`**. With **`@nestjs/config` 4.x`**, be aware of **precedence / validation timing** changes vs older majors—read the release notes for the exact version you install (validated env vs `process.env` ordering, `skipProcessEnv`, etc.). Prefer the **NestJS 11–compatible** current 4.x line.

- **Avoid** adding `@nestjs/swagger`, PDF stacks, ORM, or AWS SDKs in this story.

### Project structure notes

- New files expected under **`homeinspection-api/src/config/`** only (+ `.env.example`, test file, `package.json` / lockfile).  
- **`AppModule`** is the **UPDATE** surface: today it has `imports: []` — replace with `ConfigModule.forRoot({...})` first in imports array.

### References (read order for implementer)

1. `_bmad-output/planning-artifacts/architecture.md` — project tree (`config/`, `.env.example`), config boundary, naming conventions.  
2. `_bmad-output/planning-artifacts/epics.md` — Epic 1, Story 1.2; scan Stories **1.6–1.7** for env-dependent behavior you are pre-wiring.  
3. `_bmad-output/project-context.md` — “Configuration and secrets”, fail-fast rule.  
4. `_bmad-output/implementation-artifacts/1-1-scaffold-nestjs-service-from-official-cli.md` — scaffold baseline and File List.

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

- E2E initially failed: `AUTH_MODE` unset because `beforeEach` runs after module graph load; fixed with `test/jest-e2e.setup.ts` + `setupFiles` in `jest-e2e.json` so env is set before `AppModule` initializes.

### Completion Notes List

- Added `@nestjs/config` ^4.x, global `ConfigModule.forRoot` with `envFilePath: ['.env.local', '.env']` and `validateEnv` (no Joi/Zod).
- Implemented `src/config/env.validation.ts` (fail-fast, error lists keys) and `src/config/configuration.ts` with `getAppConfig()` / `AppConfig` (camelCase view over validated `ConfigService` keys).
- `main.ts` uses `getAppConfig()` for listen port; `void bootstrap()` retained.
- Added `homeinspection-api/.env.example` and root `README.MD` copy instructions for `.env`.
- Unit tests: `env.validation.spec.ts`; e2e: `jest-e2e.setup.ts` for required env.
- Verified: `npm run lint`, `build`, `test` (11 tests after review patch), `test:e2e` — all pass.

### File List

- `homeinspection-api/package.json`
- `homeinspection-api/package-lock.json`
- `homeinspection-api/src/app.module.ts`
- `homeinspection-api/src/main.ts`
- `homeinspection-api/src/config/env.validation.ts`
- `homeinspection-api/src/config/env.validation.spec.ts`
- `homeinspection-api/src/config/configuration.ts`
- `homeinspection-api/.env.example`
- `homeinspection-api/test/jest-e2e.json`
- `homeinspection-api/test/jest-e2e.setup.ts`
- `README.MD`

---

## Change Log

- **2026-05-04:** Story created — `bmad-create-story` auto-discovered backlog **1.2**; status **ready-for-dev**.
- **2026-05-04:** Story 1.2 implemented — `@nestjs/config`, env validation, `.env.example`, README, tests; status **review**.
- **2026-05-04:** Code review — applied patch (rate-limit validation tests); story marked **done**.

### Review Findings

- [x] [Review][Patch] Missing unit tests for invalid rate-limit integers — Resolved: added `it` blocks for invalid `RATE_LIMIT_WINDOW_MINUTES` and `RATE_LIMIT_MAX_REQUESTS` in `env.validation.spec.ts` (code review 2026-05-04).

- [x] [Review][Defer] `validateEnv` return merges `...config` with `...out` [`homeinspection-api/src/config/env.validation.ts:106`] — deferred, pre-existing pattern — Host/platform env keys not explicitly validated still flow into the merged object available to `ConfigService`. Low risk for this prototype; revisit with an explicit allowlist if you need strict env surface area (compliance / least surprise).

---

**Story context:** Ultimate BMad create-story pass — comprehensive developer guide for Story **1.2** only; defer HTTP governance (filters, guards, interceptors, versioned routes) to Stories **1.3–1.7**.
