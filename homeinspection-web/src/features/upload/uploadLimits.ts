/**
 * Client mirrors of Phase 1 upload limits — keep aligned with Nest `ReportController`
 * (`limits.fileSize`) and OpenAPI copy.
 *
 * @see `homeinspection-api/src/modules/report/report.controller.ts`
 * @see `homeinspection-api/src/openapi/upload.openapi.ts`
 * @see `homeinspection-api/docs/api/failure-matrix.md`
 */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Primary MIME for inspection PDFs accepted by the API. */
export const PDF_MIME_TYPE = 'application/pdf';

/** Match `<input accept="application/pdf,.pdf">`; octet-stream appears for some PDF sources. */
export const PDF_FRIENDLY_MIME_TYPES = [
  PDF_MIME_TYPE,
  'application/octet-stream',
] as const;
