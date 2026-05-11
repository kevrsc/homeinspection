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
  return { Authorization: `Bearer ${cfg.apiKey}` };
}
