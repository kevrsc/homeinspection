# homeinspection-web

Phase 2 homeowner client scaffold ([Story 4.1](../_bmad-output/implementation-artifacts/4-1-web-client-scaffold-and-api-integration.md)): Vite + React + TypeScript, multipart upload to Phase 1 `POST /v1/report/upload`. **Story 4.2** adds Tailwind v4 (`@tailwindcss/vite`), Direction 1 tokens in `src/index.css`, and `AppShell` layout.

## Breakpoints

Per [**Breakpoint Strategy**](../_bmad-output/planning-artifacts/ux-design-specification.md) (Tailwind-style defaults):

| Token | Width |
|-------|-------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |

Design tokens, typography scale notes, Direction 4/5 override guidance, and layout intent live in **[docs/design-foundations.md](docs/design-foundations.md)**.

## Prerequisites

- Node.js in the same engine range as `homeinspection-api` (see `package.json` → `engines`).
- Running API from `homeinspection-api/` with `.env` configured (`AUTH_MODE`, mock headers or `API_KEYS`, rate limits).

## Setup

```bash
cd homeinspection-web
copy .env.example .env
# Edit .env so mock/live headers match homeinspection-api/.env
npm install
npm run dev
```

Open the printed local URL (default **http://localhost:5173**).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | API origin, **no** trailing slash required. **Empty** with **`npm run dev`** uses relative `/v1/...` so the Vite **dev** `server.proxy` forwards to the Nest server without CORS changes. Does **not** apply to `vite preview` or static hosting — see **Preview and production** below. |
| `VITE_AUTH_MODE` | `mock` or `live` — must match API `AUTH_MODE`. |
| `VITE_MOCK_AUTH_HEADER_NAME` / `VITE_MOCK_AUTH_HEADER_VALUE` | Required for `mock`; must equal API `MOCK_AUTH_HEADER_*`. |
| `VITE_API_KEY` | Required for `live`; sent as **`Authorization: Bearer <key>`**. The API also accepts `x-api-key`; this client uses Bearer only. |
| `VITE_PROXY_TARGET` | Optional; default `http://localhost:3000`. Used only in `vite.config.ts` for `/v1` proxying. |

## Proxy vs CORS

**Recommended for local dev (`npm run dev` only):** leave `VITE_API_BASE_URL` empty and rely on Vite `server.proxy` so the browser calls `/v1/report/upload` on the dev server; no changes to `homeinspection-api` are required.

**Alternative:** set `VITE_API_BASE_URL=http://localhost:3000` (or your API origin) and enable CORS on the Nest app for the web origin (not included in Story 4.1).

## Preview and production

Vite’s **`server.proxy` is only active during `npm run dev`**. It does **not** run for **`npm run preview`** or for static files served from `dist/` behind a generic CDN/host.

If `VITE_API_BASE_URL` is empty in those environments, the browser sends `POST /v1/report/upload` to the **same origin as the static site** (e.g. `localhost:4173`), which will fail unless you also reverse-proxy `/v1` there.

For **`vite preview`** or production hosting, either:

- set **`VITE_API_BASE_URL`** to the real API origin (and configure **CORS** on `homeinspection-api` if cross-origin), or  
- terminate traffic behind a gateway that routes **`/v1/*`** to the API.

## Run with API

Terminal A:

```bash
cd homeinspection-api
npm run start:dev
```

Terminal B:

```bash
cd homeinspection-web
npm run dev
```

For a **successful extraction (HTTP 200)**, use any **normal PDF** you have locally (e.g. export a Word/Google Doc to PDF). The repo fixture `homeinspection-api/test/fixtures/valid-upload.pdf` is only for **mocked** API e2e tests—it passes upload validation but **`pdf-parse` fails** on it, so the live API returns **422** extraction errors. Success navigates to **`/results`** with raw JSON.

## curl parity (multipart field `file`)

```bash
curl -sS -X POST "http://localhost:3000/v1/report/upload" ^
  -H "x-mock-auth: change-me-local-only" ^
  -F "file=@path/to/report.pdf"
```

(Unix shells: use `\` instead of `^` for line continuation.)

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server + proxy |
| `npm run build` | Production bundle |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (config helpers) |
