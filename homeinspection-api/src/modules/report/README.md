# Report module (`modules/report`)

Phase 1 delivers synchronous **`POST /v1/report/upload`**: validate PDF → extract observations → return section-linked JSON. This README maps the **extension seams** called out in Story **2.10** (FR37–FR39, NFR17) without adding persistence, queues, or AI code.

## Layer map

| Piece | Role |
|-------|------|
| [`report.controller.ts`](report.controller.ts) | HTTP boundary: multipart intake, guards, delegates to service. **Do not** embed persistence or messaging here. |
| [`report.service.ts`](report.service.ts) | Orchestration: timeout-wrapped `PdfObservationExtractor.extract`, maps to `ReportUploadResponseDto`. Primary hook point for **future side effects** that must follow the same outcome as the HTTP response (see below). |
| [`extractors/pdf-observation-extractor.port.ts`](extractors/pdf-observation-extractor.port.ts) | Port: `PdfObservationExtractor` + `PDF_OBSERVATION_EXTRACTOR` token. |
| [`extractors/pdf-observation-extractor.adapter.ts`](extractors/pdf-observation-extractor.adapter.ts) | Default adapter implementation bound in [`report.module.ts`](report.module.ts). |
| [`report.module.ts`](report.module.ts) | Wires controller, service, and `provide: PDF_OBSERVATION_EXTRACTOR`. Future adapters/modules register here or via importing modules. |

Parent overview: [`README.md`](../../../README.md) → **Extension ports & future phases**.

---

## Persistence (FR37)

**Attachment ideas** (Phase 2+; no MySQL/driver in Phase 1):

- After `ReportService.extractPreview` produces a successful `ReportUploadResponseDto`, a dedicated **repository/outbox adapter** (new provider in a future `modules/persistence/` or similar—see [`architecture.md`](../../../../_bmad-output/planning-artifacts/architecture.md)) can persist upload metadata, hashed file references, and extraction snapshots.
- Prefer **application-layer calls or transactional outbox** invoked from orchestration code paths that already know success vs. classified failure—keep PDF parsing behind `PdfObservationExtractor` only.

---

## Async / queue publishing (FR38)

**Attachment ideas:**

- Emit outbound messages **after** outcomes are known (success path after mapping; failure path from the global filter or a narrow domain event mapper—architecture guides naming such as `report.uploaded`, `report.extractionFailed`).
- Payloads that cross process boundaries should carry **`schemaVersion`** when persisted or queued (architecture convention).
- Package consumers under something like `src/modules/.../consumers/` or `src/workers/` **later**; Phase 1 must **not** register dormant consumers required for CI.

---

## AI-assisted enrichment (FR39)

**Attachment ideas:**

- Introduce a **second port** (new injection token) that transforms `PdfExtractionResult` or `ReportUploadResponseDto` before returning—implemented only when product requires it; or
- Provide a **composite/wrapper** implementation behind `PDF_OBSERVATION_EXTRACTOR` if enrichment stays tightly coupled to parsing (still keep HTTP contract stable unless API versioning changes).

Avoid importing cloud SDKs into domain-facing types under `extractors/` without an adapter boundary.

---

## Future HTTP resources / UI-track APIs (FR40, Epic 3)

**Attachment ideas:**

- Add **new controllers or Nest modules** with explicit `/v1/...` or newer API versions; compose shared logic via exported providers from `ReportModule` **only** where appropriate—do not inflate `ReportController` into a general-purpose API surface.
- UX/UI backlog and traceability are **Epic 3 Story 3.1**; Phase 1 remains API-first.

---

## Phase 1 anti-goals (Story 2.10 / AC5)

The following are **out of scope** for satisfying extension documentation:

- AWS SDK, SQS consumers, or MySQL/ORM wired into `AppModule`/`ReportModule` “just in case”.
- Background workers or unused `@Injectable()` queue stubs executed in CI.
- New npm dependencies for this story.

Quality gates: `npm run lint`, `npm run build`, `npm run test`, `npm run test:e2e` from `homeinspection-api/`.
