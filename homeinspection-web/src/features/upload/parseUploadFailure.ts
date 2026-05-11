const FALLBACK_SNIPPET_MAX = 500;

export type ParsedUploadFailure =
  | {
      kind: 'structured';
      httpStatus: number;
      code: string;
      message: string;
      requestId?: string;
      details?: unknown;
    }
  | {
      kind: 'fallback';
      httpStatus: number;
      detailText?: string;
    };

export function isStructuredErrorEnvelope(body: unknown): body is {
  error: {
    code: string;
    message: string;
    requestId?: unknown;
    details?: unknown;
  };
} {
  if (!body || typeof body !== 'object') return false;
  const envelope = body as Record<string, unknown>;
  const err = envelope.error;
  if (!err || typeof err !== 'object') return false;
  const r = err as Record<string, unknown>;
  return typeof r.code === 'string' && typeof r.message === 'string';
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Maps Phase 1 upload JSON bodies into UI-ready shapes (`failure-matrix.md`).
 */
export function parseUploadFailure(
  body: unknown,
  httpStatus: number,
): ParsedUploadFailure {
  if (isStructuredErrorEnvelope(body)) {
    const err = body.error;
    const requestId =
      typeof err.requestId === 'string' && err.requestId.trim().length > 0
        ? err.requestId.trim()
        : undefined;
    return {
      kind: 'structured',
      httpStatus,
      code: err.code,
      message: err.message,
      requestId,
      details: err.details,
    };
  }

  let detailText: string | undefined;
  if (typeof body === 'string') {
    const t = body.trim();
    if (t.length > 0) detailText = truncate(t, FALLBACK_SNIPPET_MAX);
  } else if (body !== null && body !== undefined) {
    try {
      detailText = truncate(JSON.stringify(body), FALLBACK_SNIPPET_MAX);
    } catch {
      detailText = undefined;
    }
  }

  return {
    kind: 'fallback',
    httpStatus,
    detailText,
  };
}

/** Summary for polite live regions — keeps announcements brief (Story 4.4 AC4). */
export function summarizeUploadFailureForAnnouncement(
  failure: ParsedUploadFailure,
  maxLen = 300,
  flavor: 'upload' | 'summary' = 'upload',
): string {
  const verb = flavor === 'upload' ? 'Upload failed' : 'Summary request failed';
  if (failure.kind === 'structured') {
    const ridHint = failure.requestId ? ' Request ID included.' : '';
    return truncate(`${verb}. ${failure.code}.${ridHint}`, maxLen);
  }
  const tail =
    flavor === 'upload'
      ? 'Check your PDF and try again.'
      : 'Try again in a moment.';
  return truncate(`${verb}. HTTP ${failure.httpStatus}. ${tail}`, maxLen);
}
