import { HttpStatus, UnprocessableEntityException } from '@nestjs/common';
import {
  inferHttpLogOutcomeHint,
  mapStatusToOutcomeCategory,
} from './logging-outcome-map';

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

  it('infers summarization vs extraction for ambiguous 422 from exception details', () => {
    expect(
      inferHttpLogOutcomeHint(
        new UnprocessableEntityException({
          message:
            'Summarization could not produce a valid structured response.',
          details: { code: 'SUMMARIZATION_INVALID_RESPONSE' },
        }),
      ),
    ).toEqual({
      outcome: 'summarization_error',
      category: 'summarization',
    });
    expect(
      inferHttpLogOutcomeHint(
        new UnprocessableEntityException({
          message: 'PDF parsing failed.',
          details: { code: 'UPLOAD_PDF_PARSE_FAILED', retryable: false },
        }),
      ),
    ).toEqual({
      outcome: 'extraction_error',
      category: 'extraction',
    });
    expect(inferHttpLogOutcomeHint(new Error('other'))).toBeUndefined();
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
