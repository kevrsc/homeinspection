import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildSummarizeRequestBody,
  summarizeObservationsPayload,
} from './summarizeReport';

const mockAuth = {
  authMode: 'mock' as const,
  mockHeaderName: 'X-Mock-Auth',
  mockHeaderValue: 'test-token',
  apiKey: '',
};

describe('buildSummarizeRequestBody', () => {
  it('uses pageCount 0 when absent', () => {
    const body = buildSummarizeRequestBody({
      sections: [{ sectionName: 'roof', observations: [{ text: 'x' }] }],
    });
    expect(body.pageCount).toBe(0);
    expect(body.sections).toHaveLength(1);
  });

  it('preserves non-negative integer pageCount', () => {
    expect(
      buildSummarizeRequestBody({
        pageCount: 4,
        sections: [],
      }).pageCount,
    ).toBe(4);
  });

  it('uses 0 when pageCount is not a valid non-negative integer', () => {
    expect(
      buildSummarizeRequestBody({
        pageCount: -1,
        sections: [],
      }).pageCount,
    ).toBe(0);
    expect(
      buildSummarizeRequestBody({
        pageCount: 1.5,
        sections: [],
      }).pageCount,
    ).toBe(0);
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

  it('sends pageCount 0 in JSON when upload payload omitted pageCount', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    await summarizeObservationsPayload(
      {
        sections: [{ sectionName: 'a', observations: [{ text: 'b' }] }],
      },
      '',
      mockAuth,
    );
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).pageCount).toBe(0);
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
        { sections: [{ sectionName: 's', observations: [{ text: 't' }] }] },
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
      { sections: [{ sectionName: 's', observations: [{ text: 't' }] }] },
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
});
