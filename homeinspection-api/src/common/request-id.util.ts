import { randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';

/** Incoming header name (Express normalizes keys to lowercase). */
export const REQUEST_ID_HEADER_INCOMING = 'x-request-id';

/** Response header name (canonical casing for clients). */
export const REQUEST_ID_HEADER_OUTGOING = 'X-Request-Id';

/** Reject abuse-sized values; generate a new id instead (see README). */
export const REQUEST_ID_MAX_LENGTH = 128;

/**
 * Resolves the correlation id: non-empty client header wins; otherwise a new UUID.
 */
export function resolveRequestIdFromHeaders(
  headers: IncomingHttpHeaders,
): string {
  const raw = headers[REQUEST_ID_HEADER_INCOMING];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0 && trimmed.length <= REQUEST_ID_MAX_LENGTH) {
      return trimmed;
    }
  }
  return randomUUID();
}
