import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubGlobalFetchHangRespectingSignal } from '../test/stubFetchHangWithSignal';
import {
  buildSummarizeRequestBody,
  DEFAULT_SUMMARIZE_FETCH_TIMEOUT_MS,
  InvalidSummarizePayloadError,
  summarizeClientTimeoutDisplayLabel,
  summarizeObservationsPayload,
  SummarizeRequestAbortedError,
} from './summarizeReport';

describe('summarizeClientTimeoutDisplayLabel', () => {
  it('matches default timeout in human-readable units', () => {
    expect(summarizeClientTimeoutDisplayLabel()).toBe('5 minutes');
  });
});

const mockAuth = {
  authMode: 'mock' as const,
  mockHeaderName: 'X-Mock-Auth',
  mockHeaderValue: 'test-token',
  apiKey: '',
};

describe('buildSummarizeRequestBody', () => {
  it('throws when pageCount is missing', () => {
    expect(() =>
      buildSummarizeRequestBody({
        sections: [{ sectionName: 'roof', observations: [{ text: 'x' }] }],
      }),
    ).toThrow(InvalidSummarizePayloadError);
    expect(() =>
      buildSummarizeRequestBody({
        sections: [{ sectionName: 'roof', observations: [{ text: 'x' }] }],
      }),
    ).toThrow(/pageCount is required/);
  });

  it('preserves non-negative integer pageCount', () => {
    expect(
      buildSummarizeRequestBody({
        pageCount: 4,
        sections: [],
      }).pageCount,
    ).toBe(4);
  });

  it('throws when pageCount is negative', () => {
    expect(() =>
      buildSummarizeRequestBody({
        pageCount: -1,
        sections: [],
      }),
    ).toThrow(/non-negative integer/);
  });

  it('throws when pageCount is not an integer', () => {
    expect(() =>
      buildSummarizeRequestBody({
        pageCount: 1.5,
        sections: [],
      }),
    ).toThrow(/non-negative integer/);
  });

  it('throws when pageCount is not finite', () => {
    expect(() =>
      buildSummarizeRequestBody({
        pageCount: Number.NaN,
        sections: [],
      }),
    ).toThrow(/non-negative integer/);
  });
});

describe('summarizeObservationsPayload', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            executiveSummary: 'Exec',
            prioritizedItems: [
              { rank: 1, title: 'Fix roof', rationale: 'Water entry risk.' },
            ],
          }),
      } as unknown as Response),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs JSON with auth headers, Content-Type, and pageCount in body', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    const payload = {
      pageCount: 2,
      sections: [{ sectionName: 'roof', observations: [{ text: 'Leak.' }] }],
    };
    const result = await summarizeObservationsPayload(
      payload,
      '',
      mockAuth,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/v1/report/summarize');
    expect(init.method).toBe('POST');
    expect(init.signal).toBeDefined();
    expect(init.signal?.aborted).toBe(false);
    expect(init.headers).toMatchObject({
      'X-Mock-Auth': 'test-token',
      'Content-Type': 'application/json',
    });
    const sent = JSON.parse(init.body as string);
    expect(sent.pageCount).toBe(2);
    expect(sent.sections).toEqual(payload.sections);
    expect(result.executiveSummary).toBe('Exec');
    expect(result.prioritizedItems).toHaveLength(1);
    expect(result.prioritizedItems[0].title).toBe('Fix roof');
  });

  it('does not call fetch when pageCount is missing', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    await expect(
      summarizeObservationsPayload(
        {
          sections: [{ sectionName: 'a', observations: [{ text: 'b' }] }],
        },
        '',
        mockAuth,
      ),
    ).rejects.toMatchObject({
      status: 0,
      body: {
        error: expect.objectContaining({
          code: 'CLIENT_SUMMARIZE_PAYLOAD_INVALID',
        }),
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws with status and body on non-OK response for parseUploadFailure', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () =>
        JSON.stringify({
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests',
            requestId: 'rid-1',
          },
        }),
    } as unknown as Response);

    await expect(
      summarizeObservationsPayload(
        { pageCount: 1, sections: [{ sectionName: 's', observations: [{ text: 't' }] }] },
        '',
        mockAuth,
      ),
    ).rejects.toMatchObject({
      status: 429,
      body: {
        error: expect.objectContaining({ code: 'RATE_LIMITED' }),
      },
    });
  });

  it('uses Bearer token when authMode is live', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    await summarizeObservationsPayload(
      { pageCount: 0, sections: [{ sectionName: 's', observations: [{ text: 't' }] }] },
      '',
      {
        authMode: 'live',
        mockHeaderName: '',
        mockHeaderValue: '',
        apiKey: 'secret',
      },
    );
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer secret',
      'Content-Type': 'application/json',
    });
  });

  it('does not call fetch when live apiKey is empty', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    await expect(
      summarizeObservationsPayload(
        { pageCount: 1, sections: [{ sectionName: 's', observations: [{ text: 't' }] }] },
        '',
        {
          authMode: 'live',
          mockHeaderName: '',
          mockHeaderValue: '',
          apiKey: '',
        },
      ),
    ).rejects.toMatchObject({
      status: 0,
      body: {
        error: expect.objectContaining({ code: 'CLIENT_AUTH_CONFIG' }),
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not call fetch when live apiKey is whitespace-only', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    await expect(
      summarizeObservationsPayload(
        { pageCount: 1, sections: [{ sectionName: 's', observations: [{ text: 't' }] }] },
        '',
        {
          authMode: 'live',
          mockHeaderName: '',
          mockHeaderValue: '',
          apiKey: '   ',
        },
      ),
    ).rejects.toMatchObject({
      status: 0,
      body: {
        error: expect.objectContaining({ code: 'CLIENT_AUTH_CONFIG' }),
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('summarizeObservationsPayload client timeout and abort', () => {
  const mockAuth = {
    authMode: 'mock' as const,
    mockHeaderName: 'X-Mock-Auth',
    mockHeaderValue: 'test-token',
    apiKey: '',
  };

  const payload = {
    pageCount: 1,
    sections: [{ sectionName: 's', observations: [{ text: 't' }] }],
  };

  const originalFetch = globalThis.fetch;

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = originalFetch;
  });

  it(
    'rejects with CLIENT_SUMMARIZE_TIMEOUT when fetch never resolves',
    async () => {
      stubGlobalFetchHangRespectingSignal();
      const p = summarizeObservationsPayload(payload, '', mockAuth, {
        clientTimeoutMs: 40,
      });
      await expect(p).rejects.toMatchObject({
        status: 0,
        body: {
          error: expect.objectContaining({ code: 'CLIENT_SUMMARIZE_TIMEOUT' }),
        },
      });
    },
    10_000,
  );

  it('throws SummarizeRequestAbortedError when signal is already aborted', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const ac = new AbortController();
    ac.abort();
    await expect(
      summarizeObservationsPayload(payload, '', mockAuth, {
        signal: ac.signal,
      }),
    ).rejects.toBeInstanceOf(SummarizeRequestAbortedError);
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it('throws SummarizeRequestAbortedError when signal aborts during a pending fetch', async () => {
    stubGlobalFetchHangRespectingSignal();
    const ac = new AbortController();
    const p = summarizeObservationsPayload(payload, '', mockAuth, {
      signal: ac.signal,
      clientTimeoutMs: DEFAULT_SUMMARIZE_FETCH_TIMEOUT_MS,
    });
    ac.abort();
    await expect(p).rejects.toBeInstanceOf(SummarizeRequestAbortedError);
  });
});
