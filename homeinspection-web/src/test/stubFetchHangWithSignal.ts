import type { Mock } from 'vitest';
import { vi } from 'vitest';

/**
 * Replaces `globalThis.fetch` with a mock that never resolves unless `init.signal` aborts
 * (matches real `fetch` behavior enough for summarize timeout/abort tests).
 */
export function stubGlobalFetchHangRespectingSignal(): Mock<
  (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
> {
  const fn = vi.fn(((_url: RequestInfo | URL, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      const s = init?.signal;
      if (!s) {
        reject(new Error('stubFetch: RequestInit.signal is required'));
        return;
      }
      const onAbort = (): void => {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      };
      if (s.aborted) {
        onAbort();
        return;
      }
      s.addEventListener('abort', onAbort, { once: true });
    });
  }) as typeof fetch);
  vi.stubGlobal('fetch', fn);
  if (typeof globalThis.window !== 'undefined') {
    Object.assign(globalThis.window, { fetch: fn });
  }
  return fn;
}
