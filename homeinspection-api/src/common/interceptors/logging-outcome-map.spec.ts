import { HttpStatus } from '@nestjs/common';
import { mapStatusToOutcomeCategory } from './logging-outcome-map';

describe('mapStatusToOutcomeCategory', () => {
  it('maps success statuses to success/extraction', () => {
    expect(mapStatusToOutcomeCategory(200)).toEqual({
      outcome: 'success',
      category: 'extraction',
    });
  });

  it('maps validation statuses to validation_error/validation', () => {
    expect(mapStatusToOutcomeCategory(HttpStatus.BAD_REQUEST)).toEqual({
      outcome: 'validation_error',
      category: 'validation',
    });
    expect(mapStatusToOutcomeCategory(HttpStatus.PAYLOAD_TOO_LARGE)).toEqual({
      outcome: 'validation_error',
      category: 'validation',
    });
  });

  it('maps extraction timeout and extraction failures deterministically', () => {
    expect(mapStatusToOutcomeCategory(HttpStatus.REQUEST_TIMEOUT)).toEqual({
      outcome: 'timeout_error',
      category: 'timeout',
    });
    expect(mapStatusToOutcomeCategory(HttpStatus.UNPROCESSABLE_ENTITY)).toEqual(
      {
        outcome: 'extraction_error',
        category: 'extraction',
      },
    );
  });

  it('maps auth and rate limiting to stable categories', () => {
    expect(mapStatusToOutcomeCategory(HttpStatus.UNAUTHORIZED)).toEqual({
      outcome: 'auth_error',
      category: 'auth',
    });
    expect(mapStatusToOutcomeCategory(HttpStatus.TOO_MANY_REQUESTS)).toEqual({
      outcome: 'rate_limit_error',
      category: 'governance',
    });
  });

  it('maps 5xx and fallback statuses', () => {
    expect(
      mapStatusToOutcomeCategory(HttpStatus.INTERNAL_SERVER_ERROR),
    ).toEqual({
      outcome: 'internal_error',
      category: 'internal',
    });
    expect(mapStatusToOutcomeCategory(HttpStatus.NOT_FOUND)).toEqual({
      outcome: 'request_error',
      category: 'request',
    });
  });
});
