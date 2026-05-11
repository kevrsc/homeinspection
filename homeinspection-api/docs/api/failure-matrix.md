# Upload Failure Matrix (`POST /v1/report/upload`)

This matrix documents runtime-aligned success and failure outcomes for the upload endpoint.  
All failure examples use the stable error envelope and include a placeholder `requestId`.

## Source of Truth

- Runtime behavior: `homeinspection-api/test/app.e2e-spec.ts`
- Error envelope mapping: `homeinspection-api/src/common/filters/http-exception.filter.ts`
- OpenAPI contract: `homeinspection-api/openapi/openapi.json`
- JSON fixtures: `homeinspection-api/test/fixtures/json/`

## Outcome Matrix

| Outcome | Trigger condition | HTTP status | Top-level code | Client handling guidance | Fixture |
|---|---|---:|---|---|---|
| Success | Valid PDF under size limit and extraction succeeds | 200 | n/a | Render grouped sections/observations and continue normal workflow. | `test/fixtures/json/upload-success.json` |
| Validation: file required | Request omits multipart `file` field | 400 | `VALIDATION_FAILED` | Prompt user to attach a PDF before retrying. | `test/fixtures/json/upload-error-validation-missing-file.json` |
| Validation: wrong type / magic bytes | File is not a PDF (`text/plain` or invalid `%PDF-` magic bytes) | 400 | `VALIDATION_FAILED` | Ask user for a valid PDF file and retry. | `test/fixtures/json/upload-error-validation-type.json` |
| Validation: oversize | File exceeds 20 MB upload limit | 413 | `VALIDATION_FAILED` | Ask user to upload a smaller file. | `test/fixtures/json/upload-error-validation-size.json` |
| Unauthorized | Missing/invalid auth header in mock auth mode | 401 | `UNAUTHORIZED` | Re-authenticate or set required auth header before retrying. | `test/fixtures/json/upload-error-auth.json` |
| Rate limited | Request budget exceeded in configured window | 429 | `RATE_LIMITED` | Back off until window resets; respect `details` limits. | `test/fixtures/json/upload-error-rate-limit.json` |
| Extraction failure | PDF parser cannot extract a valid structure | 422 | `EXTRACTION_FAILED` | Ask user to try a different PDF or manually inspect report. | `test/fixtures/json/upload-error-extraction.json` |
| Extraction timeout | Extraction exceeds configured timeout budget | 408 | `EXTRACTION_TIMEOUT` | Retry later or with a smaller/simpler PDF. | `test/fixtures/json/upload-error-timeout.json` |

## Fixture Policy

- Fixtures are deterministic, ASCII JSON, and safe for CI.
- Failure fixtures include `requestId` placeholders rather than runtime-generated values.
- Envelope keys are fixed: `error.code`, `error.message`, `error.requestId`, optional `error.details`.

## Example JSON envelopes

Below are copy-paste shapes aligned with `test/fixtures/json/*.json`. Prefer opening the fixture files for canonical formatting.

### Success — `test/fixtures/json/upload-success.json`

```json
{
  "pageCount": 1,
  "sections": [
    {
      "sectionName": "roof",
      "observations": [{ "text": "Damaged shingle near ridge" }]
    },
    {
      "sectionName": "plumbing",
      "observations": [{ "text": "Slow leak at shutoff valve" }]
    }
  ]
}
```

### Validation: file required — `test/fixtures/json/upload-error-validation-missing-file.json`

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "PDF file is required.",
    "requestId": "00000000-0000-4000-8000-000000000000",
    "details": { "code": "UPLOAD_FILE_REQUIRED" }
  }
}
```

### Validation: wrong type — `test/fixtures/json/upload-error-validation-type.json`

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Only PDF uploads are supported.",
    "requestId": "00000000-0000-4000-8000-000000000000",
    "details": { "code": "UPLOAD_PDF_REQUIRED" }
  }
}
```

### Validation: oversize — `test/fixtures/json/upload-error-validation-size.json`

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Payload Too Large",
    "requestId": "00000000-0000-4000-8000-000000000000"
  }
}
```

### Unauthorized — `test/fixtures/json/upload-error-auth.json`

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized",
    "requestId": "00000000-0000-4000-8000-000000000000"
  }
}
```

### Rate limited — `test/fixtures/json/upload-error-rate-limit.json`

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too Many Requests",
    "requestId": "00000000-0000-4000-8000-000000000000",
    "details": {
      "code": "RATE_LIMIT_EXCEEDED",
      "windowMinutes": 60,
      "maxRequests": 2
    }
  }
}
```

### Extraction failure — `test/fixtures/json/upload-error-extraction.json`

```json
{
  "error": {
    "code": "EXTRACTION_FAILED",
    "message": "PDF parsing failed. Please upload a different PDF file.",
    "requestId": "00000000-0000-4000-8000-000000000000",
    "details": {
      "code": "UPLOAD_PDF_PARSE_FAILED",
      "retryable": false
    }
  }
}
```

### Extraction timeout — `test/fixtures/json/upload-error-timeout.json`

```json
{
  "error": {
    "code": "EXTRACTION_TIMEOUT",
    "message": "Upload processing timed out. Please retry with a smaller file or try again later.",
    "requestId": "00000000-0000-4000-8000-000000000000",
    "details": {
      "code": "UPLOAD_PROCESSING_TIMEOUT",
      "retryable": true,
      "timeoutMs": 20
    }
  }
}
```

---

# Summarize failure matrix (`POST /v1/report/summarize`)

Documents runtime-aligned outcomes for the JSON summarize endpoint (same request body shape as upload success).  
Examples below are inline shapes aligned with OpenAPI and `http-exception.filter.ts`; dedicated JSON fixtures may be added in Story 5.5.

## Outcome matrix (summarize)

| Outcome | Trigger condition | HTTP status | Top-level code | Client handling guidance | Fixture |
|---|---|---:|---|---|---|
| Success | Valid auth, valid body, LLM returns parseable structured summary | 200 | n/a | Render `executiveSummary` and ordered `prioritizedItems`. | — |
| Validation: body | Malformed JSON object, bad `pageCount`, empty `sectionName`, empty observation `text`, or payload over configured caps (`sections` count, observations per section, string lengths — see OpenAPI `maxItems` / `maxLength` on summarize request) | 400 | `VALIDATION_FAILED` | Fix body to match upload success shape; inspect `details.code` (`SUMMARIZATION_BODY_INVALID` vs `SUMMARIZATION_BODY_LIMIT_EXCEEDED`). | — |
| Unauthorized | Missing/invalid auth (same as upload) | 401 | `UNAUTHORIZED` | Re-authenticate before retrying. | `test/fixtures/json/upload-error-auth.json` |
| Rate limited | **Shared** sliding window per client identity across **`POST /v1/report/upload`**, **`POST /v1/report/summarize`**, and **`POST /v1/report/summarize/file`** (`RATE_LIMIT_*`) | 429 | `RATE_LIMITED` | Back off; heavy traffic on one route consumes quota for the others. | `test/fixtures/json/upload-error-rate-limit.json` |
| Summarization timeout | LLM adapter abort / timeout | 408 | `SUMMARIZATION_TIMEOUT` | Retry later; `details.retryable` is true. | — |
| Summarization invalid output | Model output failed schema validation | 422 | `SUMMARIZATION_FAILED` | Retry with same payload only if inputs changed; otherwise treat as model-side issue. | — |
| Summarization upstream | LLM HTTP error or network unreachable | 502 | `SUMMARIZATION_UNAVAILABLE` | Retry later; do not treat as client validation error. | — |

## Example JSON (summarize)

### Success response (inline example)

```json
{
  "executiveSummary": "Roof wear is the primary theme in the supplied notes.",
  "prioritizedItems": [
    {
      "rank": 1,
      "title": "Roof: damaged shingles near ridge",
      "rationale": "Observation text notes missing shingles at the ridge."
    }
  ]
}
```

### Failure: invalid body (400)

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "sectionName must not be empty or whitespace-only.",
    "requestId": "00000000-0000-4000-8000-000000000000",
    "details": { "code": "SUMMARIZATION_BODY_INVALID" }
  }
}
```

### Failure: body over summarize caps (400)

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "sections must contain at most 80 entries.",
    "requestId": "00000000-0000-4000-8000-000000000000",
    "details": {
      "code": "SUMMARIZATION_BODY_LIMIT_EXCEEDED",
      "field": "sections",
      "max": 80
    }
  }
}
```

---

# Single-shot summarize failure matrix (`POST /v1/report/summarize/file`)

Multipart **`file`** (same field name and PDF rules as **`POST /v1/report/upload`**). The server runs **extract → summarize** in one request. Outcomes combine **upload-class** validation and extraction errors with **JSON summarize-class** summarization failures.

## Outcome matrix (single-shot PDF → summary)

| Outcome | Trigger condition | HTTP status | Top-level code | Client handling guidance | Fixture |
|---|---|---:|---|---|---|
| Success | Valid PDF, extraction succeeds, LLM returns parseable summary | 200 | n/a | Same as JSON summarize success body (`ObservationSummary`). | — |
| Validation: file required | Request omits multipart `file` | 400 | `VALIDATION_FAILED` | Same as upload missing file. | `test/fixtures/json/upload-error-validation-missing-file.json` |
| Validation: wrong type / magic | Not `application/pdf` or missing `%PDF-` prefix | 400 | `VALIDATION_FAILED` | Same as upload non-PDF. | `test/fixtures/json/upload-error-validation-type.json` |
| Validation: oversize | File exceeds 20 MB | 413 | `VALIDATION_FAILED` | Same as upload oversize. | `test/fixtures/json/upload-error-validation-size.json` |
| Unauthorized | Missing/invalid auth | 401 | `UNAUTHORIZED` | Same as upload / summarize. | `test/fixtures/json/upload-error-auth.json` |
| Rate limited | Same sliding window as other report POSTs (per `RATE_LIMIT_*` config) | 429 | `RATE_LIMITED` | Same as upload / JSON summarize. | `test/fixtures/json/upload-error-rate-limit.json` |
| Validation: summarize caps | Extraction yields more sections/observations/text than JSON summarize allows | 400 | `VALIDATION_FAILED` | Same `SUMMARIZATION_BODY_LIMIT_EXCEEDED` semantics as JSON summarize after extract. | — |
| Extraction failure | PDF parser cannot extract valid structure | 422 | `EXTRACTION_FAILED` | Same envelope as upload extraction failure. | `test/fixtures/json/upload-error-extraction.json` |
| Extraction timeout | Extraction exceeds configured timeout | 408 | `EXTRACTION_TIMEOUT` | Same as upload timeout (`UPLOAD_PROCESSING_TIMEOUT`). | `test/fixtures/json/upload-error-timeout.json` |
| Summarization timeout | LLM adapter timeout after successful extraction | 408 | `SUMMARIZATION_TIMEOUT` | Same as JSON summarize timeout. | — |
| Summarization invalid output | Model output failed schema validation | 422 | `SUMMARIZATION_FAILED` | Same as JSON summarize invalid response. | — |
| Summarization upstream | LLM HTTP error or unreachable | 502 | `SUMMARIZATION_UNAVAILABLE` | Same as JSON summarize upstream. | — |
