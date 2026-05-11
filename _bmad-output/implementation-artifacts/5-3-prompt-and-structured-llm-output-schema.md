# Story 5.3: Prompt and structured LLM output schema

Status: done

## Story

As a homeowner (via an API client),  
I want the model output to **summarize** findings and **prioritize** what to address first in predictable JSON,  
So that clients can render or store results without fragile free-text parsing.

## Acceptance Criteria

1. **Given** validated observation input (sections + observation texts),  
   **When** the LLM completes successfully,  
   **Then** the service returns a **documented JSON shape**: `executiveSummary` (string) plus **ordered** `prioritizedItems[]` with `rank`, `title`, and `rationale`, with the same shape recorded under **OpenAPI `components.schemas`** (`ObservationSummary`, `PrioritizedObservationItem`).

2. **And** the **system prompt** instructs the model to stay grounded in supplied observations and to avoid inventing findings not present in the input, and to emit **only** a JSON object (adapter tolerates optional ` ```json ` fences).

3. **And** malformed or schema-violating assistant output surfaces as **`SummarizationProviderError`** with code **`INVALID_RESPONSE`** (consistent with Story 5.2).

## Tasks / Subtasks

- [x] Define TypeScript types (`ObservationSummaryResult`, `PrioritizedObservationItem`) and align **`AiSummarizer`** / **`SummarizationResult`** to the structured result (AC: #1).
- [x] Add **`SUMMARIZATION_SYSTEM_PROMPT`** and send **`system` + `user`** messages from **`OllamaSummarizerAdapter`** (user message remains JSON-serialized `ReportUploadResponseDto`) (AC: #2).
- [x] Implement **`parseObservationSummaryFromAssistantText`** with rank sequence validation (1..n, no gaps/duplicates), non-empty `executiveSummary` / `title` / `rationale`, optional markdown fence stripping (AC: #1–#3).
- [x] Register OpenAPI schema fragments in **`openapi/summarization.openapi.ts`** and merge into **`createOpenApiDocument`** in **`app.setup.ts`** (AC: #1).
- [x] Unit tests for parser and adapter updates; e2e asserts summary schemas are published on **`GET /openapi.json`** (AC: #1).

### Review Findings

- [x] [Review][Patch] Return `prioritizedItems` sorted by ascending `rank` after validation so API order matches AC “ordered” semantics regardless of model array order [`parse-observation-summary.ts`](../../homeinspection-api/src/modules/report/summarization/parse-observation-summary.ts) (applied 2026-05-11).

- [x] [Review][Defer] Markdown fence stripping uses `lastIndexOf('```')`, which could truncate incorrectly if a JSON string field contained a literal triple-backtick sequence [`parse-observation-summary.ts`](../../homeinspection-api/src/modules/report/summarization/parse-observation-summary.ts) — deferred, rare; revisit if models emit fenced fragments inside strings.

## Scope boundaries

| In scope (5.3) | Out of scope |
|----------------|--------------|
| Prompt + parse + types + OpenAPI components | **`POST` summarize route**, guards, rate limit (**5.4**) |
| Validate assistant JSON | E2E against live Ollama (**5.5** / manual) |

## Dev Notes

- **5.2 adapter** remains the transport; **5.3** owns semantics from assistant string → **`ObservationSummaryResult`**.
- **`openapi:check`** requires **`openapi/openapi.json`** regenerated after schema merges (`npm run openapi:generate`).

## Change Log

- **2026-05-11:** Structured summary types, system prompt, strict parser, OpenAPI components merge, adapter and e2e updates.
- **2026-05-11:** Code review patch — return `prioritizedItems` sorted by ascending `rank` after validation; regression test added.

## Dev Agent Record

### Completion Notes List

- **`SummarizationResult`** is now **`ObservationSummaryResult`** (`executiveSummary` + `prioritizedItems`).
- OpenAPI **`components.schemas.ObservationSummary`** / **`PrioritizedObservationItem`** merged in **`createOpenApiDocument`** for contract visibility ahead of **5.4**.

### File List

- `homeinspection-api/src/modules/report/summarization/observation-summary.types.ts` (new)
- `homeinspection-api/src/modules/report/summarization/summarization-prompt.ts` (new)
- `homeinspection-api/src/modules/report/summarization/parse-observation-summary.ts` (new)
- `homeinspection-api/src/modules/report/summarization/parse-observation-summary.spec.ts` (new)
- `homeinspection-api/src/openapi/summarization.openapi.ts` (new)
- `homeinspection-api/src/modules/report/summarization/ai-summarizer.port.ts`
- `homeinspection-api/src/modules/report/summarization/ollama-summarizer.adapter.ts`
- `homeinspection-api/src/modules/report/summarization/ollama-summarizer.adapter.spec.ts`
- `homeinspection-api/src/app.setup.ts`
- `homeinspection-api/test/app.e2e-spec.ts`
- `homeinspection-api/openapi/openapi.json`
