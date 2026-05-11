<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Request correlation ID

Every HTTP response includes an **`X-Request-Id`** header with the correlation id used for that request (aligned with server logs). Clients **may** send their own id using **`x-request-id`** (or **`X-Request-Id`**); if the value is non-empty after trimming and no longer than **128** characters, the API echoes it in **`X-Request-Id`**. If the header is absent, empty, whitespace-only, or too long, the server generates a new id with `crypto.randomUUID()`.

The header is also set in **`RequestIdMiddleware`** as soon as the id is resolved so **404** and other responses that bypass global interceptors still include **`X-Request-Id`**.

Downstream code (and Story **1.4** error JSON) should read the same value from **`req.requestId`** or **`getRequestIdFromExecutionContext(context)`** so logs, headers, and error bodies stay consistent.

## Error envelope contract (v1 foundation)

All HTTP failures handled by the global exception filter return a deterministic JSON envelope:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Not Found",
    "requestId": "f5e5efef-13d6-45e2-bf6b-7d39f64db465",
    "details": {}
  }
}
```

- `error.code` is a stable classification derived from HTTP status (`VALIDATION_FAILED`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL_ERROR`).
- `error.requestId` always matches the `X-Request-Id` response header for the same request.
- Internal failures are sanitized and never expose stack traces or implementation details.
- OpenAPI examples and schemas in Story **2.8** must align with this runtime envelope.

## Developer failure matrix and JSON fixtures

Story **2.9** publishes integration aids for consumer apps:

- Failure matrix: `docs/api/failure-matrix.md`
- Copy-paste JSON fixtures: `test/fixtures/json/`

These artifacts are runtime-aligned references for success and representative failure classes for **`POST /v1/report/upload`** and **`POST /v1/report/summarize`**.

## Extension ports & future phases

Story **2.10** documents where later capabilities attach **without** changing the Phase 1 behavior of `POST /v1/report/upload`. Detailed seams live in [`src/modules/report/README.md`](src/modules/report/README.md).

| Seam | Intent (FR37–FR39; NFR17—preserve migration path to async/persistent workflows) |
|------|----------------------------|
| **Persistence** | Durable storage of uploads, extraction snapshots, or audit rows hooks after successful orchestration in `ReportService` (or via outbound domain events consumed by a future persistence module). |
| **Async / events** | Outbound messaging after validation/extraction outcomes; architecture expects dot-lower event names (e.g. `report.uploaded`) and versioned payloads with `schemaVersion` when persisted or queued—see planning architecture doc linked below. No queue worker is required for Phase 1 CI. |
| **AI enrichment** | Optional enrichment behind an extra port or a composed extractor step **after** `PdfObservationExtractor` returns structured observations; preserve the HTTP JSON contract unless versioning explicitly evolves it. |
| **Future HTTP / UI-track APIs** | Add versioned controllers/modules alongside this service (Epic 3 / FR40), rather than overloading the upload handler internals. |

**Planning references** (repo root, relative from this folder: `../…`):

- Architecture & phased roadmap: [`../_bmad-output/planning-artifacts/architecture.md`](../_bmad-output/planning-artifacts/architecture.md)

**Contract anchor:** runtime response and error shapes remain documented in [`docs/api/failure-matrix.md`](docs/api/failure-matrix.md) and OpenAPI (`openapi/openapi.json`).

## Local LLM (Epic 5, Story 5.1)

Run an **[Ollama](https://ollama.com/)** container next to the API for upcoming summarize features. **CI does not start this service** — use it only when you want real inference on your machine.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) / Docker Desktop (**Windows** and **macOS** use Docker Desktop; **Linux** uses Engine + Compose plugin).

### Start Ollama

From **`homeinspection-api/`**:

```bash
docker compose up -d
```

Compose publishes **`11434` on the host loopback only** (`127.0.0.1:11434` → container `11434`). Align optional env placeholders in [`.env.example`](.env.example) (`LLM_BASE_URL`).

### Pull a small model (CPU-friendly baseline)

First pull downloads several hundred MB to GB depending on tag:

```bash
docker compose exec ollama ollama pull llama3.2:1b
```

### Verify from the host

**bash / macOS / Linux:**

```bash
curl -s http://127.0.0.1:11434/api/tags
```

**Windows (PowerShell):**

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:11434/api/tags
```

You should see JSON listing installed models. If the daemon is not ready yet, wait a few seconds and retry.

### CPU vs GPU

- **Default (`docker compose up`)** uses **CPU**. Suitable for development and smoke tests; inference is slower.
- **Linux + NVIDIA GPU:** install the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html), then add GPU device reservations per Ollama’s current Docker guidance (for example `deploy.resources.reservations.devices` with `nvidia.com/gpu` — adjust when you pin a production compose overlay).

### Stop / reset

```bash
docker compose down
```

Volume **`ollama_data`** keeps downloaded models across restarts; remove it with `docker compose down -v` only if you intend to reclaim disk space.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
