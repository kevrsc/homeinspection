import { summarizeEndpoint } from '../config';
import type { UploadSuccessPayload } from '../features/results/uploadSuccessModel';
import {
  parseObservationSummary,
  type ObservationSummary,
} from '../features/results/observationSummaryModel';
import { buildAuthHeaders, type UploadAuthHeaders } from './authHeaders';

/** Thrown when upload JSON cannot be turned into a valid summarize body (parity with API `parseAndValidateSummarizeBody`). */
export class InvalidSummarizePayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSummarizePayloadError';
  }
}

/** Caller aborted or component unmounted — UI should not treat as a surfaced HTTP failure. */
export class SummarizeRequestAbortedError extends Error {
  constructor(message = 'Summarize request was cancelled.') {
    super(message);
    this.name = 'SummarizeRequestAbortedError';
  }
}

/**
 * Default wall-clock bound for `POST /v1/report/summarize` on the client (five minutes).
 * UI copy must use {@link summarizeClientTimeoutDisplayLabel} so hint text and timeout stay aligned.
 */
export const DEFAULT_SUMMARIZE_FETCH_TIMEOUT_MS = 300_000;

/**
 * Human-readable duration for UI (e.g. "5 minutes", "45 seconds") — derived only from
 * {@link DEFAULT_SUMMARIZE_FETCH_TIMEOUT_MS}.
 */
export function summarizeClientTimeoutDisplayLabel(): string {
  const totalSeconds = Math.round(DEFAULT_SUMMARIZE_FETCH_TIMEOUT_MS / 1000);
  if (totalSeconds >= 60 && totalSeconds % 60 === 0) {
    const minutes = totalSeconds / 60;
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  return `${totalSeconds} second${totalSeconds === 1 ? '' : 's'}`;
}

export type SummarizeObservationsOptions = {
  /** When aborted (e.g. unmount or superseded request), fetch is cancelled and {@link SummarizeRequestAbortedError} is thrown. */
  signal?: AbortSignal;
  /** Override client timeout for tests; defaults to {@link DEFAULT_SUMMARIZE_FETCH_TIMEOUT_MS}. */
  clientTimeoutMs?: number;
};

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

function clientStructuredSummarizeError(
  code: string,
  message: string,
): Error & { status: number; body: unknown } {
  const err = new Error(message) as Error & { status: number; body: unknown };
  err.status = 0;
  err.body = {
    error: {
      code,
      message,
    },
  };
  return err;
}

/** JSON body for `POST /v1/report/summarize` — `pageCount` required (non-negative integer), same rules as the API. */
export function buildSummarizeRequestBody(
  payload: UploadSuccessPayload,
): { pageCount: number; sections: UploadSuccessPayload['sections'] } {
  const raw = payload.pageCount;
  if (raw === undefined) {
    throw new InvalidSummarizePayloadError(
      'pageCount is required for summarize (must be present on the upload success payload, matching the API contract).',
    );
  }
  if (
    typeof raw !== 'number' ||
    !Number.isFinite(raw) ||
    !Number.isInteger(raw) ||
    raw < 0
  ) {
    throw new InvalidSummarizePayloadError(
      'pageCount must be a non-negative integer (same rule as POST /v1/report/summarize on the API).',
    );
  }
  return { pageCount: raw, sections: payload.sections };
}

/**
 * POST JSON upload-success shape to summarize. Throws `Error & { status: number; body: unknown }` on non-OK HTTP (mirrors `uploadReportPdf`).
 * Applies a client-side timeout and optional caller `signal` (see {@link SummarizeObservationsOptions}).
 */
export async function summarizeObservationsPayload(
  payload: UploadSuccessPayload,
  apiBaseUrl: string,
  auth: UploadAuthHeaders,
  options?: SummarizeObservationsOptions,
): Promise<ObservationSummary> {
  const url = summarizeEndpoint(apiBaseUrl);

  let headers: Record<string, string>;
  try {
    const authInit = buildAuthHeaders(auth);
    headers = {
      ...(authInit as Record<string, string>),
      'Content-Type': 'application/json',
    };
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : String(cause);
    throw clientStructuredSummarizeError('CLIENT_AUTH_CONFIG', message);
  }

  let body: string;
  try {
    body = JSON.stringify(buildSummarizeRequestBody(payload));
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : String(cause);
    throw clientStructuredSummarizeError(
      'CLIENT_SUMMARIZE_PAYLOAD_INVALID',
      message,
    );
  }

  const userSignal = options?.signal;
  const clientTimeoutMs =
    options?.clientTimeoutMs ?? DEFAULT_SUMMARIZE_FETCH_TIMEOUT_MS;

  const merged = new AbortController();
  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const onUserAbort = (): void => {
    merged.abort();
  };

  const clearTimer = (): void => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  if (userSignal) {
    if (userSignal.aborted) {
      throw new SummarizeRequestAbortedError();
    }
    userSignal.addEventListener('abort', onUserAbort, { once: true });
  }

  timeoutId = setTimeout(() => {
    timedOut = true;
    merged.abort();
  }, clientTimeoutMs);

  try {
    const response = await globalThis.fetch(url, {
      method: 'POST',
      headers,
      body: body,
      signal: merged.signal,
    });
    clearTimer();

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
      const err = new Error(
        'Summarize response was not valid JSON summary shape',
      ) as Error & {
        status: number;
        body: unknown;
      };
      err.status = response.status;
      err.body = parsed;
      throw err;
    }

    return summary.data;
  } catch (error: unknown) {
    clearTimer();
    if (isAbortError(error)) {
      if (userSignal?.aborted) {
        throw new SummarizeRequestAbortedError();
      }
      if (timedOut) {
        throw clientStructuredSummarizeError(
          'CLIENT_SUMMARIZE_TIMEOUT',
          `Summarize request timed out on the client after ${clientTimeoutMs}ms. You can retry. (This is separate from an HTTP 408 from the API.)`,
        );
      }
      throw new SummarizeRequestAbortedError();
    }
    throw error;
  } finally {
    clearTimer();
    if (userSignal) {
      userSignal.removeEventListener('abort', onUserAbort);
    }
  }
}
