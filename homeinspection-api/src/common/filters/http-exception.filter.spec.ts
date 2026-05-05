import { HttpException, HttpStatus } from '@nestjs/common';
import {
  DEFAULT_INTERNAL_ERROR_MESSAGE,
  ERROR_CODE_BY_STATUS,
  buildErrorEnvelope,
} from './http-exception.filter';

describe('http-exception.filter helpers', () => {
  it('maps known statuses to deterministic error codes', () => {
    expect(ERROR_CODE_BY_STATUS[HttpStatus.BAD_REQUEST]).toBe(
      'VALIDATION_FAILED',
    );
    expect(ERROR_CODE_BY_STATUS[HttpStatus.UNAUTHORIZED]).toBe('UNAUTHORIZED');
    expect(ERROR_CODE_BY_STATUS[HttpStatus.FORBIDDEN]).toBe('FORBIDDEN');
    expect(ERROR_CODE_BY_STATUS[HttpStatus.NOT_FOUND]).toBe('NOT_FOUND');
    expect(ERROR_CODE_BY_STATUS[HttpStatus.TOO_MANY_REQUESTS]).toBe(
      'RATE_LIMITED',
    );
  });

  it('builds envelope from HttpException object response', () => {
    const exception = new HttpException(
      { message: 'Bad payload', details: { field: 'file' } },
      HttpStatus.BAD_REQUEST,
    );

    expect(buildErrorEnvelope(exception, 'rid-1')).toEqual({
      statusCode: HttpStatus.BAD_REQUEST,
      body: {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Bad payload',
          requestId: 'rid-1',
          details: { field: 'file' },
        },
      },
    });
  });

  it('sanitizes unexpected errors to internal message', () => {
    const exception = new Error(
      'SQL connection failed with stack trace details',
    );

    expect(buildErrorEnvelope(exception, 'rid-2')).toEqual({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: {
          code: 'INTERNAL_ERROR',
          message: DEFAULT_INTERNAL_ERROR_MESSAGE,
          requestId: 'rid-2',
        },
      },
    });
  });
});
