import { summarizeEndpoint } from '../config';
import type { UploadSuccessPayload } from '../features/results/uploadSuccessModel';
import {
  parseObservationSummary,
  type ObservationSummary,
} from '../features/results/observationSummaryModel';
import { buildAuthHeaders, type UploadAuthHeaders } from './authHeaders';

/** JSON body for `POST /v1/report/summarize` — `pageCount` required by API (defaults to 0 when absent on upload payload). */
export function buildSummarizeRequestBody(
  payload: UploadSuccessPayload,
): { pageCount: number; sections: UploadSuccessPayload['sections'] } {
  const raw = payload.pageCount;
  const pageCount =
    typeof raw === 'number' &&
    Number.isFinite(raw) &&
    Number.isInteger(raw) &&
    raw >= 0
      ? raw
      : 0;
  return { pageCount, sections: payload.sections };
}

/**
 * POST JSON upload-success shape to summarize. Throws `Error & { status: number; body: unknown }` on non-OK HTTP (mirrors `uploadReportPdf`).
 */
export async function summarizeObservationsPayload(
  payload: UploadSuccessPayload,
  apiBaseUrl: string,
  auth: UploadAuthHeaders,
): Promise<ObservationSummary> {
  const url = summarizeEndpoint(apiBaseUrl);
  const body = JSON.stringify(buildSummarizeRequestBody(payload));
  const authInit = buildAuthHeaders(auth);
  const headers: Record<string, string> = {
    ...(authInit as Record<string, string>),
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
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
    const err = new Error(
      `Summarize failed: HTTP ${response.status}`,
    ) as Error & { status: number; body: unknown };
    err.status = response.status;
    err.body = parsed;
    throw err;
  }

  const summary = parseObservationSummary(parsed);
  if (!summary.ok) {
    const err = new Error('Summarize response was not valid JSON summary shape') as Error & {
      status: number;
      body: unknown;
    };
    err.status = response.status;
    err.body = parsed;
    throw err;
  }

  return summary.data;
}
