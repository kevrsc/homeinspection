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
