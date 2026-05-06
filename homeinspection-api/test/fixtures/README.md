# PDF Fixtures

Deterministic fixtures used by e2e tests for Story 2.6.

- `valid-upload.pdf`: minimal valid-PDF marker used for success-path uploads.
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
