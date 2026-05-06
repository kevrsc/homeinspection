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
