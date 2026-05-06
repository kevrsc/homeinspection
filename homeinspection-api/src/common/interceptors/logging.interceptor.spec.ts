import { Logger } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';
import { EventEmitter } from 'node:events';
import { of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

type HttpContext = {
  req: Partial<Request>;
  res: Response;
};

function createExecutionContext(http: HttpContext): ExecutionContext {
  return {
    getType: jest.fn(() => 'http'),
    switchToHttp: jest.fn(() => ({
      getRequest: () => http.req,
      getResponse: () => http.res,
    })),
  } as unknown as ExecutionContext;
}

describe('LoggingInterceptor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('emits structured completion log with deterministic fields', () => {
    const interceptor = new LoggingInterceptor();
    const resEmitter = new EventEmitter();
    const res = Object.assign(resEmitter, {
      statusCode: 400,
    }) as unknown as Response;
    const context = createExecutionContext({
      req: {
        requestId: 'req-123',
        method: 'POST',
        originalUrl: '/v1/report/upload',
      },
      res,
    });
    const handler: CallHandler = { handle: () => of({}) };
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    interceptor.intercept(context, handler).subscribe();
    resEmitter.emit('finish');

    const firstCall = loggerSpy.mock.calls[0] as [unknown] | undefined;
    const message = firstCall?.[0];
    expect(typeof message).toBe('string');
    const parsed = JSON.parse(message as string) as {
      message: string;
      requestId: string;
      statusCode: number;
      outcome: string;
      category: string;
      durationMs: number;
    };

    expect(parsed.message).toBe('http_request_complete');
    expect(parsed.requestId).toBe('req-123');
    expect(parsed.statusCode).toBe(400);
    expect(parsed.outcome).toBe('validation_error');
    expect(parsed.category).toBe('validation');
    expect(parsed.durationMs).toBeGreaterThanOrEqual(0);
  });
});
