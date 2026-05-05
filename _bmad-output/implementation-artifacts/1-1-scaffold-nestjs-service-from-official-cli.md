# Story 1.1: Scaffold NestJS service from official CLI

Status: done

## Story

As a **prototype maintainer**,  
I want **the repository initialized with the official NestJS CLI starter** using the agreed project name,  
So that **all later stories follow the same module layout, Jest defaults, and build commands documented in Architecture**—without improvising folder structure or HTTP framework choices.

## Acceptance Criteria

1. **AC1 — Scaffold exists and runs**  
   **Given** the monorepo root already contains planning artifacts (`_bmad-output/`, etc.) and must not be overwritten by `nest new .`,  
   **When** a developer runs the Architecture-approved scaffold (see Dev Notes for exact non-interactive command),  
   **Then** a new subdirectory `homeinspection-api/` exists at the repository root containing a standard Nest CLI layout (`src/`, `nest-cli.json`, `package.json`, `tsconfig*.json`, default `AppModule`, etc.).  
   **And** from `homeinspection-api/`, `npm run build` (or `nest build`) completes with exit code 0 and `npm run start` (or `nest start`) boots the default app without runtime errors.

2. **AC2 — Node engine documented**  
   **Given** Architecture calls for pinning Node LTS when manifests exist,  
   **When** the scaffold is committed,  
   **Then** `homeinspection-api/package.json` includes an `engines.node` field (or the root `README.md` documents the supported Node LTS range alongside the app path) consistent with the team’s chosen LTS (document the exact version range you selected in Dev Agent Record).  
   **And** the choice is compatible with the Nest CLI / Nest major version generated (see Latest Tech Notes).

3. **AC3 — Git hygiene**  
   **Given** this repository may already be a git working tree with no commits yet or with commits only at root,  
   **When** the Nest project is generated,  
   **Then** the CLI must **not** create a nested `.git` inside `homeinspection-api/` (use `--skip-git` or equivalent).  
   **And** only intentional application files are added; do not commit `node_modules/`, `dist/`, or local env files.

4. **AC4 — No scope creep**  
   **Given** this is the first implementation story,  
   **When** the scaffold is complete,  
   **Then** there is **no** custom business domain code, PDF parsing libraries, database drivers, or `POST /v1/report/upload` implementation yet (those belong to Stories 1.2+).  
   **And** default Nest lint/test scripts remain usable (`npm run lint`, `npm run test`).

## Tasks / Subtasks

- [x] **T1 — Choose root layout** (AC: 1, 3)  
  - [x] Confirm Nest app lives at repo root path `homeinspection-api/` (sibling to `_bmad-output/`), not `nest new .` on repo root.

- [x] **T2 — Generate project** (AC: 1, 3, 4)  
  - [x] From repo root, run non-interactive Nest CLI generation with `--skip-git`, explicit `--package-manager npm`, and `--strict` (TypeScript default).  
  - [x] Run `npm install` inside `homeinspection-api/` if the generator did not install dependencies.  
  - [x] Verify `nest build` / `npm run build` and `npm run start` / `nest start`.

- [x] **T3 — Document Node + app entry** (AC: 2)  
  - [x] Set `engines.node` in `homeinspection-api/package.json` **or** document Node LTS in root `README.md` with path to the API package.  
  - [x] Add a short “Run the API” section: `cd homeinspection-api && npm run start:dev` (or project convention).

- [x] **T4 — Repository integration** (AC: 3)  
  - [x] Ensure root `.gitignore` ignores `homeinspection-api/node_modules`, `homeinspection-api/dist`, and env files if not already covered by nested `.gitignore`.  
  - [x] (Optional) First git commit for scaffold — **not run** in this session; team can `git add` / `git commit` when ready.

## Dev Notes

### Architecture compliance (must follow)

- **Starter is mandatory:** Use the NestJS official CLI starter exactly as the Architecture “Initialization Command” specifies; do not substitute Express/Fastify raw templates or alternate starters.  
  [Source: `_bmad-output/planning-artifacts/architecture.md` — section “Starter Template Evaluation” / “Selected Starter: NestJS official CLI starter”]

- **First story rule:** Architecture explicitly states project initialization with this command **should be the first implementation story** (this story).  
  [Source: same file — note under starter]

- **Future boundaries (do not implement now):** Domain/application code must eventually sit behind ports; no AWS/MySQL/PDF SDKs in domain modules. This story only establishes the Nest shell where later modules (`report`, `common`, `config`, etc.) will attach.  
  [Source: `_bmad-output/planning-artifacts/architecture.md` — “Technical Constraints”, “Core Architectural Decisions”, project tree sections]

- **Config policy:** Full env fail-fast and `.env.example` are **Story 1.2**; do not build a custom config module in 1.1 beyond what the CLI generates.

### Recommended non-interactive scaffold command

From **repository root** (`homeinspection/`):

```bash
npx @nestjs/cli@latest new homeinspection-api --package-manager npm --skip-git --strict
```

- **`--skip-git`:** Avoids a nested git repository inside `homeinspection-api/` when the outer repo is already under git.  
- **`--package-manager npm`:** Reduces prompts when combined with other flags (per Nest CLI behavior).  
- **`--strict`:** Aligns with `project-context.md` preference for `strict: true` TypeScript once `tsconfig` exists.

If the CLI version prompts for anything else in your environment, prefer passing explicit flags documented in `nest new --help` for that CLI version rather than guessing defaults.

### Project structure notes

- **Expected layout after scaffold:** `homeinspection-api/src/main.ts`, `src/app.module.ts`, `src/app.controller.ts`, `src/app.service.ts`, `test/jest-e2e.json` (names may vary slightly by CLI version).  
- **Epic 1 follow-on stories** will add `src/config/`, `src/common/`, `src/modules/report/`, etc., per Architecture—**do not invent a different folder convention** in 1.1.  
  [Source: `_bmad-output/planning-artifacts/architecture.md` — “Implementation Patterns” / project tree]

- **Root README:** If the existing root `README.MD` only describes BMad planning, append a subsection pointing developers to `homeinspection-api/` for the runnable service (optional but helps onboarding).

### Library / framework requirements

- **NestJS + TypeScript** from CLI; **Jest** as default unit test runner (verify scripts in `package.json`).  
- **Do not add** `@nestjs/swagger`, PDF parsers, ORM, or AWS SDKs in this story (violates AC4 and confuses dependency baseline).

### Testing requirements

- Run **`npm run test`** (or `nest test`) in `homeinspection-api/` once after scaffold; default AppController tests should pass.  
- No integration tests or Testcontainers in this story (Story 2.6 introduces fixture-driven integration tests).

### PRD / epic traceability

- Supports **Epic 1** foundation so later work can satisfy **FR18** (versioned routes), **FR19–FR23** (auth/rate limit), and extraction **FR1–FR16** on top of a running service. This story alone does not close FRs—it enables them.  
  [Source: `_bmad-output/planning-artifacts/epics.md` — Story 1.1 and Epic 1 narrative]

### UX / product

- No homeowner UI in Phase 1; UX spec does not change scaffold commands. Optional: ensure default JSON error format is **not** customized in this story (Story 1.4 owns global error shape).

### Previous story intelligence

- **None** — first implementation story in Epic 1.

### Git intelligence

- **Repository state:** `git log` may show **no commits yet** on `main`; this story may produce the first commit containing only `homeinspection-api/` (and any README/gitignore updates). Do not assume prior application code patterns exist in-repo.

### Latest tech information (May 2026)

- `@nestjs/cli` **11.x** is the current stable line on npm; it bundles modern TypeScript and tooling. Prefer **`npx @nestjs/cli@latest`** at implementation time so security patches flow in; pin a specific CLI version in internal docs only if the team requires reproducible scaffolds.  
- **Node:** Prefer an **active or maintenance LTS** (e.g. 22.x or 24.x per your org policy when you implement) and record it in `engines`. Align with `@types/node` major implied by the generated `package.json` if present.

### Project context reference

- TypeScript strictness and ports/adapters discipline apply to **future** stories; this story should not add plain JS source files for app logic.  
  [Source: `_bmad-output/project-context.md` — Language-Specific Rules, Framework-Specific Rules]

### References (read order for implementer)

1. `_bmad-output/planning-artifacts/architecture.md` — Starter Template Evaluation, Initialization Command, file organization patterns.  
2. `_bmad-output/planning-artifacts/epics.md` — Epic 1, Story 1.1 acceptance criteria.  
3. `_bmad-output/project-context.md` — Testing, dependency, and TypeScript guardrails.  
4. `_bmad-output/planning-artifacts/prd.md` — Phase 1 scope reminder (single synchronous upload API; no persistence/async in v1).

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

- Windows: `Start-Process npm` failed without `npm.cmd` path; `start:prod` smoke test used `Get-Command npm.cmd` then `Invoke-WebRequest` to `http://127.0.0.1:3000` → HTTP 200.

### Completion Notes List

- Scaffolded with `npx @nestjs/cli@latest new homeinspection-api --package-manager npm --skip-git --strict`; no nested `.git` under `homeinspection-api/`.
- Added `engines.node` (`>=20.18.0 <25`) to match Nest 11 / `@types/node` ^24 and LTS guidance.
- Root `README.MD` updated with “Run the API”; root `.gitignore` and `homeinspection-api/.gitignore` added (CLI did not emit API `.gitignore` in this version).
- Fixed ESLint `@typescript-eslint/no-floating-promises` in `src/main.ts` via `void bootstrap();`.
- Verified: `npm run build`, `npm run test`, `npm run test:e2e`, `npm run lint` (clean), and brief `start:prod` HTTP 200.

### File List

- `homeinspection-api/` (entire Nest CLI scaffold: `package.json`, `package-lock.json`, `nest-cli.json`, `tsconfig*.json`, `src/`, `test/`, `eslint.config.mjs`, `.prettierrc`, `README.md`, `.gitignore`)
- `homeinspection-api/src/main.ts` (lint fix)
- `.gitignore` (new, repo root)
- `README.MD` (Run the API section)

## Change Log

- **2026-05-04:** Story 1.1 implemented — NestJS `homeinspection-api` scaffold, Node engines, gitignore hygiene, README run instructions, `main.ts` lint fix; story marked **review**.
- **2026-05-04:** Code review — staged repo-root `.gitignore` and `README.MD`; patch finding resolved; story marked **done**.

### Review Findings

- [x] [Review][Patch] Staging omits repo-root story artifacts — Resolved: `git add .gitignore README.MD` so the first commit aligns with the story File List and T4 root ignores. Original risk: staged set previously included only `homeinspection-api/`, so AC evidence and root `git add .` hygiene were incomplete.

- [x] [Review][Defer] `PORT` env edge in bootstrap [`homeinspection-api/src/main.ts:6`] — deferred, pre-existing — `process.env.PORT ?? 3000` treats `""` as set (not nullish) and does not validate numeric strings; tighten when Story 1.2 owns configuration.

- [x] [Review][Defer] `npm run lint` runs ESLint with `--fix` [`homeinspection-api/package.json:18`] — deferred, pre-existing — Nest CLI default; may surprise CI if you expected check-only lint; split `lint` / `lint:fix` later if needed.

- [x] [Review][Defer] Package metadata placeholders [`homeinspection-api/package.json`] — deferred, pre-existing — `author` / `description` empty and `license: UNLICENSED`; normal for a fresh scaffold—fill when product/legal naming is decided.

- [x] [Review][Defer] TypeScript strictness shape [`homeinspection-api/tsconfig.json`] — deferred, pre-existing — Template enables several strict flags but not the umbrella `"strict": true`; reconcile with `project-context.md` in a small follow-up if you want full `strict` parity.

---

**Story context:** Ultimate BMad create-story pass — comprehensive developer guide for Story **1.1** only; defer auth, errors, upload route, and PDF work to subsequent stories.
