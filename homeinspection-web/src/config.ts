export type AuthMode = 'mock' | 'live';

/** Strip trailing slashes from origin/base URL. Empty string means use same-origin paths (Vite dev proxy). */
export function normalizeApiBase(raw: string | undefined): string {
  if (raw === undefined || raw === '') {
    return '';
  }
  return raw.replace(/\/+$/, '');
}

export function readWebConfig(): {
  apiBaseUrl: string;
  authMode: AuthMode;
  mockHeaderName: string;
  mockHeaderValue: string;
  apiKey: string;
} {
  const authRaw = (import.meta.env.VITE_AUTH_MODE ?? '').trim().toLowerCase();
  if (authRaw !== 'mock' && authRaw !== 'live') {
    throw new Error(
      `[homeinspection-web] VITE_AUTH_MODE must be "mock" or "live" (got "${import.meta.env.VITE_AUTH_MODE ?? ''}").`,
    );
  }
  const authMode = authRaw as AuthMode;

  const apiBaseUrl = normalizeApiBase(import.meta.env.VITE_API_BASE_URL);

  const mockHeaderName = (import.meta.env.VITE_MOCK_AUTH_HEADER_NAME ?? '').trim();
  const mockHeaderValue = (import.meta.env.VITE_MOCK_AUTH_HEADER_VALUE ?? '').trim();
  const apiKey = (import.meta.env.VITE_API_KEY ?? '').trim();

  if (authMode === 'mock') {
    if (!mockHeaderName || !mockHeaderValue) {
      throw new Error(
        '[homeinspection-web] VITE_AUTH_MODE=mock requires VITE_MOCK_AUTH_HEADER_NAME and VITE_MOCK_AUTH_HEADER_VALUE (must match homeinspection-api .env MOCK_AUTH_HEADER_*).',
      );
    }
  } else if (!apiKey) {
    throw new Error(
      '[homeinspection-web] VITE_AUTH_MODE=live requires VITE_API_KEY (sent as Authorization: Bearer <key>).',
    );
  }

  return {
    apiBaseUrl,
    authMode,
    mockHeaderName,
    mockHeaderValue,
    apiKey,
  };
}

export function uploadEndpoint(base: string): string {
  const path = '/v1/report/upload';
  if (!base) {
    return path;
  }
  return `${base}${path}`;
}

export function summarizeEndpoint(base: string): string {
  const path = '/v1/report/summarize';
  if (!base) {
    return path;
  }
  return `${base}${path}`;
}
