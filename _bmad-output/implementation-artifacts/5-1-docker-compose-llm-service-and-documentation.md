# Story 5.1: Docker Compose LLM service and documentation

Status: done

<!-- Ultimate context engine analysis completed — comprehensive developer guide created -->

## Story

As a prototype maintainer,  
I want a documented way to run an LLM locally alongside the API (for example via Docker Compose),  
So that developers can exercise real inference without relying on CI or external GPUs.

## Acceptance Criteria

1. **Given** the repository documents how to start the LLM service (image, model pull, ports, CPU vs GPU notes),  
   **When** a developer follows those steps,  
   **Then** they can reach the inference endpoint from the host network using values mirrored in `homeinspection-api/.env.example`.

2. **And** the default CI pipeline is **not** required to start this container (heavy integration remains optional/manual unless explicitly added later).

## Tasks / Subtasks

- [x] Add Compose definition under `homeinspection-api/` for an LLM runtime (AC: #1)
  - [x] Prefer **one** clear Compose file (see Dev Notes for naming); include exposed port(s), optional volume for model cache, and a minimal health/readiness hint or documented verification command.
  - [x] Do **not** add Compose startup to existing CI jobs (AC: #2).
- [x] Document developer workflow (AC: #1)
  - [x] Add a **Local LLM** (or equivalent) section to `homeinspection-api/README.md`: prerequisites (Docker), commands (`docker compose … up`), **Windows/macOS/Linux** caveats if relevant, **CPU vs GPU** expectations (CPU-first baseline is acceptable).
  - [x] Document how to **pull a small default model** and verify the daemon responds from the host (e.g. Ollama: `/api/tags` or equivalent for chosen stack).
- [x] Align `.env.example` with documented host URL (AC: #1)
  - [x] Add a commented block for future Epic 5 wiring (e.g. base URL / host / port placeholder) matching what README instructs.
  - [x] **Do not** introduce **required** boot env vars in `env.validation.ts` in this story unless defaults keep Phase 1 boot unchanged — Story **5.2** owns wiring validated LLM config into Nest.

## Dev Notes

### Scope boundaries (critical)

- **In scope:** Docker Compose (LLM service only), docs, `.env.example` **comments/placeholders** for URLs mirrored in README.
- **Out of scope:** Nest `AiSummarizationPort`, HTTP adapters, summarize route, OpenAPI for summarize, rate limiting on summarize, integration tests that call a live LLM in CI — Stories **5.2–5.5**.

### Recommended default stack

- **Ollama** (`ollama/ollama` image) is the **default recommendation**: single container, common local workflow, host API typically on **port 11434**.
- If you choose a different runtime (llama.cpp server, vLLM, etc.), document parity: host-reachable URL, how to pull/load a model, and verification steps — keep Epic **5.2** adapter choice aligned (OpenAI-compatible vs native Ollama paths).

### Compose file placement and naming

- Planning architecture lists `homeinspection-api/docker-compose.yml` [Source: `_bmad-output/planning-artifacts/architecture.md` — Project Structure].  
- **No** `docker-compose.yml` or `Dockerfile` exists in the repo today — this story **creates** the LLM-focused Compose file.
- Acceptable patterns:
  - **`homeinspection-api/docker-compose.yml`** with a single service (e.g. `ollama`) until an API image exists; **or**
  - **`homeinspection-api/docker-compose.llm.yml`** if you want an explicit filename — document the `-f` flag. Pick **one** and reference it consistently in README.

### Cross-story contracts

- Epic **5.2** will read **`LLM_*`** (or similarly named) env vars from validated config; placeholders in `.env.example` this story should use names **you intend to keep** (avoid rename churn).
- README Phase 4 expects Docker for LLM analysis [Source: root `README.MD` Phase 4 C].

### Project structure and boundaries

- Keep LLM infra **adjacent to** `homeinspection-api/` per architecture tree; do not move Nest source under ad-hoc folders.
- Extension seam for AI remains described in `homeinspection-api/README.md` (“AI enrichment” row) [Source: `homeinspection-api/README.md` — Extension ports & future phases].

### Testing / CI

- **No** new CI step that starts the LLM container (AC: #2).
- Optional **manual** checklist in README is sufficient for this story.

### References

- Epic 5 overview and Stories 5.2–5.5: [_bmad-output/planning-artifacts/epics.md#Epic-5](../planning-artifacts/epics.md)
- Sprint change (AI-only scope): [_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-10.md](../planning-artifacts/sprint-change-proposal-2026-05-10.md)
- Env validation pattern (do not expand required vars lightly): [`homeinspection-api/src/config/env.validation.ts`](../../homeinspection-api/src/config/env.validation.ts)
- Config surface today: [`homeinspection-api/src/config/configuration.ts`](../../homeinspection-api/src/config/configuration.ts)

### Project context reference

- Ports/adapters for AI live **outside** domain coupling to HTTP/SDK in inner layers [Source: `_bmad-output/project-context.md` — boundary rules]. This story only delivers **infra + docs**; adapters arrive in **5.2**.

### Architecture compliance

- Single deployable API remains NestJS; LLM is a **sidecar** documented for local dev [Source: `_bmad-output/planning-artifacts/architecture.md` — Infrastructure & Deployment].
- Deferred architecture bullets (“AI inference service integration”) are **realized incrementally** starting with this compose/docs slice [Source: `_bmad-output/planning-artifacts/architecture.md` — Deferred Decisions].

### Previous story intelligence

- **N/A** — First story in Epic 5. Preserve Epic **1–2** conventions for env + docs (fail-fast for required vars; `.env.example` parity).

### Git intelligence summary

- Recent commits centered on **Epic 4 web** completion and planning artifacts; **`homeinspection-api`** has no Compose/Dockerfile yet — greenfield for this story.

### Latest technical specifics (compose / Ollama)

- Official image commonly published as **`ollama/ollama`** on Docker Hub; expose **`11434/tcp`** for API access from host.
- Persist models across restarts with a **named volume** mounted at Ollama’s model directory (see current image docs for path — often `/root/.ollama`).
- First-time **`ollama pull <model>`** may be large; document a **small** default model for laptops (exact tag at implementer discretion).

## Change Log

- **2026-05-11:** Added `homeinspection-api/docker-compose.yml` (Ollama), README **Local LLM** section, and commented `LLM_BASE_URL` in `.env.example`. No Nest/env.validation changes; CI unchanged.
- **2026-05-11:** Code review patches applied: pin `ollama/ollama:0.23.2`, bind `127.0.0.1:11434:11434`, README PowerShell verify snippet.

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

### Completion Notes List

- Implemented Ollama-only Compose with named volume `ollama_data`, port **11434**, healthcheck via `ollama list`.
- Documented `docker compose up`, `ollama pull llama3.2:1b`, host verification `curl …/api/tags`, CPU default + Linux NVIDIA pointer, stop/volume notes.
- `.env.example` documents commented `LLM_BASE_URL=http://127.0.0.1:11434` for Story 5.2.
- Verification: `npm test` (43 tests), `npm run test:e2e` (20 tests), `npx eslint "{src,test}/**/*.ts"` — all passed. No new automated tests (story scope: manual README checklist).
- Post–code-review: image pinned to **`ollama/ollama:0.23.2`**, ports **`127.0.0.1:11434:11434`**, README verify section includes **PowerShell** `Invoke-RestMethod`.

### File List

- `homeinspection-api/docker-compose.yml` (new)
- `homeinspection-api/README.md`
- `homeinspection-api/.env.example`

### Review Findings

- [x] [Review][Patch] Bind published Ollama port to loopback only [`homeinspection-api/docker-compose.yml:8-9`] — applied
- [x] [Review][Patch] Pin Ollama image to a digest or semver tag instead of `:latest` [`homeinspection-api/docker-compose.yml:7`] — applied (`ollama/ollama:0.23.2`)
- [x] [Review][Patch] Add Windows-friendly host verification (e.g. PowerShell `Invoke-RestMethod`) alongside `curl` [`homeinspection-api/README.md` — Local LLM § Verify] — applied
