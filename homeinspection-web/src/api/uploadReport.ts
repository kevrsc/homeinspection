import { uploadEndpoint } from '../config';
import { buildAuthHeaders, type UploadAuthHeaders } from './authHeaders';

export type { UploadAuthHeaders } from './authHeaders';

/**
 * POST multipart/form-data with field name `file` to Phase 1 upload API.
 */
export async function uploadReportPdf(
  file: File,
  apiBaseUrl: string,
  auth: UploadAuthHeaders,
): Promise<unknown> {
  const url = uploadEndpoint(apiBaseUrl);
  const body = new FormData();
  body.append('file', file);

  const response = await fetch(url, {
    method: 'POST',
    headers: buildAuthHeaders(auth),
    body,
  });

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    const err = new Error(`Upload failed: HTTP ${response.status}`) as Error & {
      status: number;
      body: unknown;
    };
    err.status = response.status;
    err.body = parsed;
    throw err;
  }

  return parsed;
}
