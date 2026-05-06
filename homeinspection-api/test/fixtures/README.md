# PDF Fixtures

Deterministic fixtures used by e2e tests for Story 2.6.

**Production extractor:** `homeinspection-api` e2e tests **mock** `PDF_OBSERVATION_EXTRACTOR`. These files are tiny stubs that usually **fail real `pdf-parse`** with errors such as `Invalid PDF structure.` They are still useful for multipart/auth/rate-limit paths and mocked extraction behavior. For **manual UI testing against `npm run start:dev`**, use a normal PDF that opens in a viewer (e.g. export any document to PDF)—**not** `valid-upload.pdf`—if you need HTTP **200** extraction.

- `valid-upload.pdf`: minimal `%PDF` marker + skeleton objects for success-path uploads **under the mocked extractor only** (may **422** with the real adapter).
- `parse-fail.pdf`: includes `force-parse-failure` marker for mocked extractor parse failure.
- `shape-fail.pdf`: includes `force-shape-failure` marker for mocked invalid extraction shape.
- `timeout.pdf`: includes `force-timeout` marker for mocked timeout scenario.
- `invalid-magic.pdf`: non-PDF magic-bytes payload but `.pdf` filename.
- `not-a-pdf.txt`: non-PDF content-type fixture.

These fixtures are intentionally small and ASCII-only for deterministic CI behavior.

## JSON contract fixtures

Story 2.9 adds copy-paste JSON fixtures for success and failure classes under:

- `json/upload-success.json`
- `json/upload-error-validation-missing-file.json`
- `json/upload-error-validation-type.json`
- `json/upload-error-validation-size.json`
- `json/upload-error-auth.json`
- `json/upload-error-rate-limit.json`
- `json/upload-error-extraction.json`
- `json/upload-error-timeout.json`
