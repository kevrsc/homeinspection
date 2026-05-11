import { ConfigService } from '@nestjs/config';
import {
  SummarizationProviderError,
  SummarizationResult,
} from './ai-summarizer.port';
import { OllamaSummarizerAdapter } from './ollama-summarizer.adapter';

describe('OllamaSummarizerAdapter', () => {
  const sampleInput = {
    pageCount: 1,
    sections: [
      {
        sectionName: 'Roof',
        observations: [{ text: 'Missing shingles' }],
      },
    ],
  };

  const validStructuredSummary = {
    executiveSummary: 'Roof section needs attention.',
    prioritizedItems: [
      {
        rank: 1,
        title: 'Missing shingles',
        rationale: 'Observation text notes missing shingles.',
      },
    ],
  };

  const ollamaAssistantPayload = (content: string): string =>
    JSON.stringify({
      model: 'llama3.2:1b',
      message: { role: 'assistant', content },
      done: true,
    });

  const makeConfig = (
    overrides: Partial<Record<string, string>> = {},
  ): ConfigService => {
    const values: Record<string, string> = {
      LLM_BASE_URL: 'http://127.0.0.1:11434',
      LLM_MODEL: 'llama3.2:1b',
      LLM_TIMEOUT_MS: '30000',
      LLM_API_KEY: '',
      ...overrides,
    };
    return {
      getOrThrow: (key: string) => {
        const v = values[key];
        if (v === undefined) {
          throw new Error(`missing ${key}`);
        }
        return v;
      },
      get: (key: string, defaultValue?: string) =>
        values[key] ?? defaultValue ?? '',
    } as unknown as ConfigService;
  };

  const originalFetch = global.fetch;

  function getFirstFetchInit(): RequestInit {
    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
    const first = fetchMock.mock.calls[0];
    if (first === undefined || first[1] === undefined) {
      throw new Error('expected fetch to have been called with init');
    }
    return first[1];
  }

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns structured summary on 200 with Ollama chat shape', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          ollamaAssistantPayload(JSON.stringify(validStructuredSummary)),
        ),
    });

    const adapter = new OllamaSummarizerAdapter(makeConfig());
    const result: SummarizationResult = await adapter.summarize(sampleInput);
    expect(result).toEqual(validStructuredSummary);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:11434/api/chat',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    const init = getFirstFetchInit();
    const reqHeaders = init.headers as Record<string, string>;
    expect(reqHeaders['Content-Type']).toBe('application/json');
    const body = JSON.parse(init.body as string) as {
      model: string;
      stream: boolean;
      format: { type: string };
      messages: { role: string; content: string }[];
    };
    expect(body.stream).toBe(false);
    expect(body.format).toEqual(
      expect.objectContaining({
        type: 'object',
        required: ['executiveSummary', 'prioritizedItems'],
      }),
    );
    expect(body.model).toBe('llama3.2:1b');
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].role).toBe('user');
    expect(JSON.parse(body.messages[1].content)).toEqual(sampleInput);
  });

  it('sends Authorization when LLM_API_KEY is set', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          ollamaAssistantPayload(JSON.stringify(validStructuredSummary)),
        ),
    });

    const adapter = new OllamaSummarizerAdapter(
      makeConfig({ LLM_API_KEY: 'secret-token' }),
    );
    await adapter.summarize(sampleInput);
    const headers = getFirstFetchInit().headers as
      | Record<string, string>
      | Headers;
    const auth =
      headers instanceof Headers
        ? headers.get('Authorization')
        : headers.Authorization;
    expect(auth).toBe('Bearer secret-token');
  });

  it('maps non-OK HTTP to HTTP_ERROR with generic message and body in cause', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('internal error'),
    });

    const adapter = new OllamaSummarizerAdapter(makeConfig());
    let caught: unknown;
    try {
      await adapter.summarize(sampleInput);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(SummarizationProviderError);
    const err = caught as SummarizationProviderError;
    expect(err.code).toBe('HTTP_ERROR');
    expect(err.message).toBe('LLM request failed with HTTP 500.');
    expect(err.message).not.toContain('internal');
    expect((err as Error & { cause?: unknown }).cause).toBe('internal error');
  });

  it('maps invalid Ollama envelope JSON to INVALID_RESPONSE', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('not-json'),
    });

    const adapter = new OllamaSummarizerAdapter(makeConfig());
    await expect(adapter.summarize(sampleInput)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('maps non-JSON assistant content to INVALID_RESPONSE', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(ollamaAssistantPayload('plain text')),
    });

    const adapter = new OllamaSummarizerAdapter(makeConfig());
    await expect(adapter.summarize(sampleInput)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('maps missing message.content to INVALID_RESPONSE', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ done: true })),
    });

    const adapter = new OllamaSummarizerAdapter(makeConfig());
    await expect(adapter.summarize(sampleInput)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('maps empty assistant content to INVALID_RESPONSE', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            message: { role: 'assistant', content: '' },
          }),
        ),
    });

    const adapter = new OllamaSummarizerAdapter(makeConfig());
    await expect(adapter.summarize(sampleInput)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('maps whitespace-only assistant content to INVALID_RESPONSE', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            message: { role: 'assistant', content: '  \n\t  ' },
          }),
        ),
    });

    const adapter = new OllamaSummarizerAdapter(makeConfig());
    await expect(adapter.summarize(sampleInput)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('concatenates assistant content from message.content string array', async () => {
    const summary = {
      executiveSummary: 'From parts.',
      prioritizedItems: [] as {
        rank: number;
        title: string;
        rationale: string;
      }[],
    };
    const json = JSON.stringify(summary);
    const partA = json.slice(0, Math.floor(json.length / 2));
    const partB = json.slice(Math.floor(json.length / 2));
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            model: 'llama3.2:1b',
            message: { role: 'assistant', content: [partA, partB] },
            done: true,
          }),
        ),
    });

    const adapter = new OllamaSummarizerAdapter(makeConfig());
    await expect(adapter.summarize(sampleInput)).resolves.toEqual(summary);
  });

  it('reads assistant content from message.content object with text field', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            model: 'llama3.2:1b',
            message: {
              role: 'assistant',
              content: {
                type: 'text',
                text: JSON.stringify({
                  executiveSummary: 'From object content.',
                  prioritizedItems: [],
                }),
              },
            },
            done: true,
          }),
        ),
    });

    const adapter = new OllamaSummarizerAdapter(makeConfig());
    await expect(adapter.summarize(sampleInput)).resolves.toEqual({
      executiveSummary: 'From object content.',
      prioritizedItems: [],
    });
  });

  it('reads assistant content from OpenAI-style choices[0].message', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: JSON.stringify({
                    executiveSummary: 'Via choices.',
                    prioritizedItems: [],
                  }),
                },
              },
            ],
          }),
        ),
    });

    const adapter = new OllamaSummarizerAdapter(makeConfig());
    await expect(adapter.summarize(sampleInput)).resolves.toEqual({
      executiveSummary: 'Via choices.',
      prioritizedItems: [],
    });
  });

  it('maps fetch network failure to UNREACHABLE', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed'));

    const adapter = new OllamaSummarizerAdapter(makeConfig());
    await expect(adapter.summarize(sampleInput)).rejects.toMatchObject({
      code: 'UNREACHABLE',
    });
  });

  it('maps fetch AbortError to TIMEOUT when caller aborts', async () => {
    global.fetch = jest.fn(
      (_url: string, init?: RequestInit): Promise<Response> => {
        const signal = init?.signal;
        if (signal === undefined) {
          return Promise.reject(new Error('expected AbortSignal'));
        }
        return new Promise((_resolve, reject) => {
          const fail = (): void => {
            const err = new Error('Aborted');
            err.name = 'AbortError';
            reject(err);
          };
          if (signal.aborted) {
            fail();
            return;
          }
          signal.addEventListener('abort', fail, { once: true });
        });
      },
    );

    const adapter = new OllamaSummarizerAdapter(
      makeConfig({ LLM_TIMEOUT_MS: '60000' }),
    );
    const ac = new AbortController();
    const promise = adapter.summarize(sampleInput, { signal: ac.signal });
    queueMicrotask(() => {
      ac.abort();
    });
    await expect(promise).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('throws TIMEOUT when caller signal is already aborted', async () => {
    global.fetch = jest.fn();
    const adapter = new OllamaSummarizerAdapter(makeConfig());
    const ac = new AbortController();
    ac.abort();
    await expect(
      adapter.summarize(sampleInput, { signal: ac.signal }),
    ).rejects.toMatchObject({ code: 'TIMEOUT' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('maps invalid LLM_TIMEOUT_MS to UNREACHABLE without calling fetch', async () => {
    global.fetch = jest.fn();
    const adapter = new OllamaSummarizerAdapter(
      makeConfig({ LLM_TIMEOUT_MS: '0' }),
    );
    await expect(adapter.summarize(sampleInput)).rejects.toMatchObject({
      code: 'UNREACHABLE',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('maps non-numeric LLM_TIMEOUT_MS to UNREACHABLE without calling fetch', async () => {
    global.fetch = jest.fn();
    const adapter = new OllamaSummarizerAdapter(
      makeConfig({ LLM_TIMEOUT_MS: 'not-a-number' }),
    );
    await expect(adapter.summarize(sampleInput)).rejects.toMatchObject({
      code: 'UNREACHABLE',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('maps missing LLM_MODEL config to UNREACHABLE without calling fetch', async () => {
    global.fetch = jest.fn();
    const values: Record<string, string> = {
      LLM_BASE_URL: 'http://127.0.0.1:11434',
      LLM_TIMEOUT_MS: '30000',
      LLM_API_KEY: '',
    };
    const config = {
      getOrThrow: (key: string) => {
        const v = values[key];
        if (v === undefined) {
          throw new Error(`missing ${key}`);
        }
        return v;
      },
      get: (key: string, defaultValue?: string) =>
        values[key] ?? defaultValue ?? '',
    } as unknown as ConfigService;
    const adapter = new OllamaSummarizerAdapter(config);
    await expect(adapter.summarize(sampleInput)).rejects.toMatchObject({
      code: 'UNREACHABLE',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
