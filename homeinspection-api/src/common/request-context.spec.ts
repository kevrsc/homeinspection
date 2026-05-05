import { ExecutionContext } from '@nestjs/common';
import { getRequestIdFromExecutionContext } from './request-context';

describe('getRequestIdFromExecutionContext', () => {
  it('returns requestId from the HTTP request', () => {
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({ requestId: 'corr-1' }),
      }),
    } as unknown as ExecutionContext;
    expect(getRequestIdFromExecutionContext(context)).toBe('corr-1');
  });

  it('throws when requestId is missing', () => {
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as unknown as ExecutionContext;
    expect(() => getRequestIdFromExecutionContext(context)).toThrow(
      /requestId is missing/,
    );
  });

  it('throws when context is not HTTP', () => {
    const context = {
      getType: () => 'rpc',
    } as unknown as ExecutionContext;
    expect(() => getRequestIdFromExecutionContext(context)).toThrow(
      /HTTP ExecutionContext/,
    );
  });
});
