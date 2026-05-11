## Deferred from: code review of 6-2-api-optional-multipart-pdf-to-summarize-single-shot.md (2026-05-11)

- Summarize routes (`POST /v1/report/summarize`, `POST /v1/report/summarize/file`) do not forward a request-scoped `AbortSignal` into `ReportService`; parity between JSON and multipart; revisit when cancellation/NFR is specified.

## Deferred from: code review of 4-2-design-tokens-and-responsive-layout-shell.md (2026-05-06)

- Breakpoint reference tables appear in both `homeinspection-web/README.md` and `homeinspection-web/docs/design-foundations.md` — intentional redundancy; avoid drift when UX widths change.

- Breakpoint widths authored in `@theme` (`--breakpoint-*`) and `BREAKPOINTS_PX` — treat `@theme` as canonical; TS mirror exists for JS/tests only.

- `ResultsPage` renders unbounded JSON — acceptable scaffold risk; revisit with observation UI / pagination.

- WCAG contrast and focus audits incomplete for primary/disabled controls — defer to Story 4.8 automated accessibility baseline.

## Deferred from: code review of 2-9-developer-facing-failure-matrix-and-fixture-json.md (2026-05-06)

- Existing oversized-upload e2e assertion is regex-based and does not fully validate structured envelope fields; keep as deferred follow-up since it predates Story 2.9 changes.
# Deferred work tracker

## Deferred from: code review of 1-1-scaffold-nestjs-service-from-official-cli.md (2026-05-04)

- **`PORT` env edge in bootstrap** (`homeinspection-api/src/main.ts`) — `process.env.PORT ?? 3000` does not coerce or validate; empty or non-numeric values can surface at `listen`. Defer to env/config hardening (e.g. Story 1.2).

- **`npm run lint` uses `--fix`** (`homeinspection-api/package.json`) — CLI default mutates files on lint; defer changing until CI conventions are set.

- **Package metadata placeholders** (`homeinspection-api/package.json`) — Empty `author`/`description` and `UNLICENSED` license; defer until product/legal pass.

- **TypeScript `strict` umbrella** (`homeinspection-api/tsconfig.json`) — Granular strict flags without top-level `"strict": true`; defer alignment with project-context strictness expectations.

## Deferred from: code review of 1-2-environment-configuration-module-and-env-example.md (2026-05-04)

- **`validateEnv` merged return** (`homeinspection-api/src/config/env.validation.ts`) — `{ ...config, ...out }` keeps unvalidated keys from the host environment in the configuration object. Acceptable for Nest 11 + `@nestjs/config` here; tighten with an explicit allowlist if compliance requires a minimal env surface.

## Deferred from: code review of 1-3-request-correlation-id-on-every-http-request.md (2026-05-04)

- **`LoggingInterceptor` logs `originalUrl`** (`homeinspection-api/src/common/interceptors/logging.interceptor.ts`) — Query strings may contain sensitive parameters in future; prefer path-only or structured redaction when logging matures.

## Deferred from: code review of 2-2-extractor-port-and-pdf-library-adapter.md (2026-05-06)

- **Missing explicit 413-to-validation error-code mapping** (`homeinspection-api/src/shared/errors/error-codes.ts`) — Oversize-upload handling existed before Story 2.2; add dedicated mapping when error taxonomy story is implemented.

## Deferred from: code review of 3-1-ux-spec-traceability-backlog-for-deferred-ui.md (2026-05-06)

- **Sprint status header comment drift** (`_bmad-output/implementation-artifacts/sprint-status.yaml`) — top comment metadata (`# last_updated`) diverges from YAML `last_updated`; cosmetic and pre-existing, defer cleanup until tracker-format maintenance pass.

## Deferred from: code review of 5-3-prompt-and-structured-llm-output-schema.md (2026-05-11)

- Markdown fence stripping uses `lastIndexOf('```')`; a JSON string field containing a literal triple-backtick sequence could be mis-split. Rare in practice; revisit if model output quality requires stricter fence handling.
