# Story 5.5: Automated tests with mock LLM and contract coverage

Status: done

<!-- Ultimate context engine analysis completed — comprehensive developer guide created -->

## Story

As a prototype maintainer,  
I want CI to verify the summarize route **without** a live LLM,  
So that merges stay reliable and fast.

## Acceptance Criteria

1. **Given** tests substitute a **mock or fake** implementation of the summarization port (`AI_SUMMARIZER`),  
   **When** the test suite runs in CI,  
   **Then** at least one test covers **successful** structured response (shape aligned with **`ObservationSummaryResult`** / OpenAPI **`ObservationSummary`**).

2. **And** at least one test covers **provider failure** and **timeout** paths mapped to the **stable error envelope** (status + `error` object + `details.code` consistent with production mapping in [`report.controller.ts`](../../homeinspection-api/src/modules/report/report.controller.ts) and [`http-exception.filter.ts`](../../homeinspection-api/src/common/filters/http-exception.filter.ts)).

3. **And** tests **do not require network access** to external LLM providers (no live **Ollama** / OpenAI calls in default **`npm test`** or **`npm run test:e2e`** paths).

## Tasks / Subtasks

- [x] **E2E provider override** (AC: #1–#3)  
  - [x] In [`test/app.e2e-spec.ts`](../../homeinspection-api/test/app.e2e-spec.ts), import **`AI_SUMMARIZER`** from [`ai-summarizer.port.ts`](../../homeinspection-api/src/modules/report/summarization/ai-summarizer.port.ts) (same pattern as existing **`PDF_OBSERVATION_EXTRACTOR`** override at module compile time).  
  - [x] Chain **`.overrideProvider(AI_SUMMARIZER).useValue({ summarize: summarizeMock })`** on the same **`Test.createTestingModule({ imports: [AppModule] })`** builder so **upload** tests keep using **`extractMock`** unchanged.  
  - [x] Default **`summarizeMock`** implementation should **`resolve`** a **fixed** [`ObservationSummaryResult`](../../homeinspection-api/src/modules/report/summarization/observation-summary.types.ts) (minimal valid payload: non-empty **`executiveSummary`**, **`prioritizedItems`** with **`rank`**, **`title`**, **`rationale`**) so accidental regressions in JSON serialization are caught.

- [x] **Happy-path HTTP contract** (AC: #1, #3)  
  - [x] Add **`POST /v1/report/summarize`** e2e: **`x-mock-auth`** header (same value as existing upload tests: **`e2e-placeholder-not-a-secret`**), JSON body matching upload success shape (reuse object from upload success expectation or read **`test/fixtures/json/upload-success.json`** if convenient).  
  - [x] Expect **200** and **`Content-Type: application/json`**; assert response body **deep-equals** the object returned by the mock (avoid asserting dynamic fields from the LLM—only the mock return value).

- [x] **Failure / timeout envelope coverage** (AC: #2, #3)  
  - [x] Configure **`summarizeMock`** (per test or `mockImplementationOnce`) to **`reject`** with **`SummarizationProviderError`** for at least:  
    - **`'TIMEOUT'`** → expect **408**, **`details.code`** **`SUMMARIZATION_TIMEOUT`**, top-level code per filter (**`SUMMARIZATION_TIMEOUT`**).  
    - **`'UNREACHABLE'`** or **`'HTTP_ERROR'`** → expect **502**, **`details.code`** **`SUMMARIZATION_UPSTREAM_ERROR`**, **`providerCode`** echoing the thrown code.  
  - [x] Optionally add **`'INVALID_RESPONSE'`** → **422** / **`SUMMARIZATION_INVALID_RESPONSE`** if you want parity with unit tests; not strictly required by epic text but strengthens contract coverage.

- [x] **Rate limit + auth sanity (optional but cheap)** (AC: #3)  
  - [x] If you add summarize **429** / **401** e2e, call **`resetRateLimitStateForTests()`** in **`beforeEach`** (already present) and mirror upload rate-limit test style (`maxRequests` from env—see existing upload 429 test).  
  - [x] Keep tests **deterministic**: do not depend on wall-clock LLM latency.  
  - **Done:** **401** without auth on summarize. **429** not duplicated here (same **`RateLimitMiddleware`** path class as upload; upload e2e already exhausts the sliding window contract).

- [x] **Fixtures + docs alignment (optional)** (AC: #1–#2)  
  - [x] If [`docs/api/failure-matrix.md`](../../homeinspection-api/docs/api/failure-matrix.md) references JSON fixtures for summarize, add files under **`test/fixtures/json/`** and extend **`EXPECTED_JSON_FIXTURE_FILES`** + **`assertJsonFixtureContract`** only when the matrix explicitly cites paths (mirror Story **2.9** / upload patterns). Otherwise matrix-only references are acceptable.  
  - **N/A:** Matrix has no **`test/fixtures/json/...summarize...`** references.

- [x] **Verification** (AC: #3)  
  - [x] Run **`cd homeinspection-api`**, then **`npm test`**, **`npm run test:e2e`**, **`npm run openapi:check`**, **`npx eslint "{src,test}/**/*.ts"`**.

### Review Findings

- [x] **[Review][Patch]** Happy-path e2e asserts **`summarizeMock`** call count but not the **first argument** passed to **`summarize`**. Add **`expect(summarizeMock).toHaveBeenCalledWith(...)`** (or assert **`mock.calls[0][0]`** deep-equals the validated DTO / fixture payload) so regressions in **body parsing → service → port** wiring are caught, not only HTTP **200** body shape. [`homeinspection-api/test/app.e2e-spec.ts`](../../homeinspection-api/test/app.e2e-spec.ts) (success test for **`POST /v1/report/summarize`**).

## Dev Notes

### Scope boundaries (critical)

| In scope (5.5) | Out of scope |
|----------------|--------------|
| **Test doubles** for **`AI_SUMMARIZER`** in automated tests | Changing **Ollama** adapter production behavior unless tests expose a bug |
| **HTTP-level** summarize success + mapped failures in e2e | MySQL, async jobs, new API routes |
| **CI-safe** runs (no outbound LLM) | Running real models in default CI |

### Why this story exists (Epic 5.4 handoff)

Story **5.4** deliberately deferred **live** summarize e2e to avoid **non-deterministic** LLM calls; **`report.controller.spec.ts`** already maps **`SummarizationProviderError`** with **`ReportService`** mocked. **5.5** closes the gap by exercising **`POST /v1/report/summarize`** through the **real** Nest pipeline (guards, filter, serialization) with a **fake port**.

### Architecture and DI (must follow)

- **Port token:** **`AI_SUMMARIZER`** is a **`Symbol`** provider in [`report.module.ts`](../../homeinspection-api/src/modules/report/report.module.ts); production uses **`OllamaSummarizerAdapter`**. Tests must **override the token**, not the concrete class, so they stay aligned with module wiring.  
- **Nest testing:** Use **`Test.createTestingModule({ imports: [AppModule] }).overrideProvider(...)`** as in [`app.e2e-spec.ts`](../../homeinspection-api/test/app.e2e-spec.ts) lines **214–219** (extractor pattern).  
- **App bootstrap:** Continue to call **`setupApp(app)`** after **`createNestApplication()`** so exception filter and OpenAPI behavior match runtime.

### Stable types and errors (do not drift)

- **Success body:** **`ObservationSummaryResult`** in [`observation-summary.types.ts`](../../homeinspection-api/src/modules/report/summarization/observation-summary.types.ts).  
- **Thrown type:** **`SummarizationProviderError`** from [`ai-summarizer.port.ts`](../../homeinspection-api/src/modules/report/summarization/ai-summarizer.port.ts); **`code`** union: **`UNREACHABLE`**, **`HTTP_ERROR`**, **`INVALID_RESPONSE`**, **`TIMEOUT`**.  
- **HTTP mapping:** Private **`mapSummarizationProviderError`** in [`report.controller.ts`](../../homeinspection-api/src/modules/report/report.controller.ts) is the source of truth for status ↔ exception.  
- **Envelope:** Global filter [`http-exception.filter.ts`](../../homeinspection-api/src/common/filters/http-exception.filter.ts) maps **`details.code`** → top-level **`error.code`** (e.g. **`SUMMARIZATION_UPSTREAM_ERROR`** → **`SUMMARIZATION_UNAVAILABLE`**). Assert **both** if contract tests aim to lock client-visible JSON exactly.

### OpenAPI contract tests (preserve)

- Existing test **`serves openapi contract json aligned to upload route`** already asserts **`/v1/report/summarize`** post body schema and **200** / **502** response keys. **Do not remove** unless you replace with equivalent coverage. Optionally extend assertions (e.g. **408**, **422**, **401**) if those responses are declared on the operation.

### Anti-patterns (avoid)

- **Do not** start Docker **Ollama** or set real **`LLM_*`** URLs for default e2e.  
- **Do not** `fetch` a public LLM from tests.  
- **Do not** duplicate large JSON blobs across many tests without a shared constant—prefer one **`const summarizeSuccessBody`** aligned with **`upload-success.json`**.

### Library / version notes

- Stack per [`package.json`](../../homeinspection-api/package.json): **NestJS**, **Jest**, **supertest**. No new dependencies expected for mocks.  
- If you consult external docs, prefer **NestJS Testing** (`overrideProvider`) for override semantics.

## Project Structure Notes

- E2E lives under **`homeinspection-api/test/`**; fixtures under **`homeinspection-api/test/fixtures/`**.  
- Summarization port and adapter under **`homeinspection-api/src/modules/report/summarization/`**.

### References

- Epic text: [`epics.md`](../planning-artifacts/epics.md) Story **5.5** (lines ~659–671)  
- Previous story: [`5-4-versioned-summarize-endpoint-openapi-auth-rate-limit.md`](./5-4-versioned-summarize-endpoint-openapi-auth-rate-limit.md)  
- Architecture: [`architecture.md`](../planning-artifacts/architecture.md) (NestJS, ports/adapters, no real cloud/LLM in tests)  
- Project rules: [`project-context.md`](../project-context.md) (test tiers, no real AWS/LLM in CI)

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

### Completion Notes List

- **`AI_SUMMARIZER`** e2e override with **`jest.fn().mockResolvedValue(e2eMockObservationSummary)`** alongside existing **`PDF_OBSERVATION_EXTRACTOR`** override.
- **Happy path:** **`POST /v1/report/summarize`** with body parsed from **`upload-success.json`** → **200** body matches mock; asserts **`summarize`** called with validated DTO and **`undefined`** options (**`toHaveBeenCalledWith`** + **`parseAndValidateSummarizeBody`**).
- **Errors:** E2e asserts full JSON envelopes for **408** (**`TIMEOUT`**), **502** (**`UNREACHABLE`**, **`HTTP_ERROR`**), **422** (**`INVALID_RESPONSE`**), plus **401** without auth.
- **`npm test`**, **`npm run test:e2e`**, **`npm run openapi:check`**, **`npx eslint "{src,test}/**/*.ts"`** all green.

### File List

- `homeinspection-api/test/app.e2e-spec.ts`

## Git intelligence (recent patterns)

- **`0aa6ed3`** — Story **5.4**: summarize route, **`summarizeOpenApiExamples.bodyInvalid`**, controller specs including **`HTTP_ERROR`** → **502**, **`openapi/openapi.json`** regeneration.  
- **`1cc6702`** — Epic **5** foundation: **`AI_SUMMARIZER`**, **Ollama** adapter, compose docs.  
- **Pattern:** E2e overrides **`PDF_OBSERVATION_EXTRACTOR`** with **`jest.fn()`**; replicate for **`AI_SUMMARIZER.summarize`**.

## Change Log

- **2026-05-10:** Epic **5** retrospective recorded in **`epic-5-retro-2026-05-10.md`**; **`epic-5-retrospective`** set to **done** in sprint status.
- **2026-05-10:** Story **5.5** marked **done**; sprint **`epic-5`** set to **done** (all Epic **5** stories **5.1**–**5.5** complete).
- **2026-05-10:** Code review patch: happy-path summarize e2e asserts **`summarize`** called with **`parseAndValidateSummarizeBody`** output and **`undefined`** options.
- **2026-05-10:** Implemented mock **`AI_SUMMARIZER`** e2e coverage; story marked **review**.
- **2026-05-10:** Story file created (`ready-for-dev`) from sprint backlog auto-discovery.
