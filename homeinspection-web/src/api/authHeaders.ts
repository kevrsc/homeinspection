import type { AuthMode } from '../config';

export type UploadAuthHeaders = {
  authMode: AuthMode;
  mockHeaderName: string;
  mockHeaderValue: string;
  apiKey: string;
};

export function buildAuthHeaders(cfg: UploadAuthHeaders): HeadersInit {
  if (cfg.authMode === 'mock') {
    return { [cfg.mockHeaderName]: cfg.mockHeaderValue };
  }
  const key = cfg.apiKey.trim();
  if (key === '') {
    throw new Error(
      '[homeinspection-web] VITE_AUTH_MODE=live requires a non-empty VITE_API_KEY (refusing to send Authorization: Bearer with an empty token).',
    );
  }
  return { Authorization: `Bearer ${key}` };
}
