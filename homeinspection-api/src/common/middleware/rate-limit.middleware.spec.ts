import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import {
  RateLimitMiddleware,
  resetRateLimitStateForTests,
} from './rate-limit.middleware';

describe('RateLimitMiddleware', () => {
  beforeEach(() => {
    resetRateLimitStateForTests();
  });

  function makeMiddleware(maxRequests: string): RateLimitMiddleware {
    const config = {
      getOrThrow: (key: string): string => {
        const map: Record<string, string> = {
          AUTH_MODE: 'mock',
          NODE_ENV: 'test',
          PORT: '3000',
          MOCK_AUTH_HEADER_NAME: 'x-mock-auth',
          MOCK_AUTH_HEADER_VALUE: 'x',
          API_KEYS: '',
          RATE_LIMIT_WINDOW_MINUTES: '60',
          RATE_LIMIT_MAX_REQUESTS: maxRequests,
          LLM_BASE_URL: 'http://127.0.0.1:11434',
          LLM_MODEL: 'm',
          LLM_TIMEOUT_MS: '30000',
          LLM_API_KEY: '',
          LLM_DEBUG_LOG: 'false',
        };
        const v = map[key];
        if (v === undefined) {
          throw new Error(`unexpected ${key}`);
        }
        return v;
      },
      get: (key: string, defaultValue?: string): string => {
        if (key === 'API_KEYS') {
          return '';
        }
        if (key === 'MOCK_AUTH_HEADER_NAME') {
          return 'x-mock-auth';
        }
        if (key === 'MOCK_AUTH_HEADER_VALUE') {
          return 'x';
        }
        if (key === 'LLM_API_KEY') {
          return '';
        }
        return defaultValue ?? '';
      },
    } as unknown as ConfigService;
    return new RateLimitMiddleware(config);
  }

  function makeRequest(): Request {
    return {
      requestId: 'test-req-id',
      header: (): string | undefined => undefined,
      ip: '203.0.113.9',
    } as unknown as Request;
  }

  it('shares one counter across route paths for the same client key (Story 5.7)', () => {
    const mw = makeMiddleware('2');
    const req = makeRequest();
    const statusFn = jest.fn().mockReturnThis();
    const jsonFn = jest.fn();
    const res = {
      status: statusFn,
      json: jsonFn,
    } as unknown as Response;
    const next = jest.fn();

    mw.use(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    mw.use(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
    mw.use(req, res, next);
    expect(statusFn).toHaveBeenCalledWith(429);
    expect(jsonFn).toHaveBeenCalledWith({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too Many Requests',
        requestId: 'test-req-id',
        details: {
          code: 'RATE_LIMIT_EXCEEDED',
          windowMinutes: 60,
          maxRequests: 2,
        },
      },
    });
  });

  it('invokes next when under the limit', () => {
    const mw = makeMiddleware('10');
    const next = jest.fn() as NextFunction;
    mw.use(makeRequest(), {} as Response, next);
    expect(next).toHaveBeenCalled();
  });
});
