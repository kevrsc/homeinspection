import { describe, expect, it } from 'vitest';
import {
  isStructuredErrorEnvelope,
  parseUploadFailure,
  summarizeUploadFailureForAnnouncement,
} from './parseUploadFailure';

/** Mirrors `homeinspection-api/test/fixtures/json/upload-error-validation-type.json` */
const VALIDATION_TYPE_FIXTURE = {
  error: {
    code: 'VALIDATION_FAILED',
    message: 'Only PDF uploads are supported.',
    requestId: '00000000-0000-4000-8000-000000000000',
    details: { code: 'UPLOAD_PDF_REQUIRED' },
  },
};

/** Mirrors `homeinspection-api/test/fixtures/json/upload-error-auth.json` */
const AUTH_FIXTURE = {
  error: {
    code: 'UNAUTHORIZED',
    message: 'Unauthorized',
    requestId: '00000000-0000-4000-8000-000000000000',
  },
};

/** Mirrors `homeinspection-api/test/fixtures/json/upload-error-timeout.json` */
const TIMEOUT_FIXTURE = {
  error: {
    code: 'EXTRACTION_TIMEOUT',
    message:
      'Upload processing timed out. Please retry with a smaller file or try again later.',
    requestId: '00000000-0000-4000-8000-000000000000',
    details: {
      code: 'UPLOAD_PROCESSING_TIMEOUT',
      retryable: true,
      timeoutMs: 20,
    },
  },
};

describe('parseUploadFailure', () => {
  it.each([
    ['validation type', VALIDATION_TYPE_FIXTURE],
    ['auth', AUTH_FIXTURE],
    ['timeout', TIMEOUT_FIXTURE],
  ])('parses structured envelope: %s', (_, body) => {
    const r = parseUploadFailure(body, 400);
    expect(r.kind).toBe('structured');
    if (r.kind !== 'structured') throw new Error('expected structured');
    const err = body.error;
    expect(r.code).toBe(err.code);
    expect(r.message).toBe(err.message);
    expect(r.requestId).toBe(err.requestId);
    if ('details' in err) {
      expect(r.details).toEqual(err.details);
    } else {
      expect(r.details).toBeUndefined();
    }
  });

  it('treats empty object as fallback', () => {
    const r = parseUploadFailure({}, 500);
    expect(r.kind).toBe('fallback');
    if (r.kind !== 'fallback') throw new Error('expected fallback');
    expect(r.httpStatus).toBe(500);
    expect(r.detailText).toBe('{}');
  });

  it('truncates long string bodies for fallback detailText', () => {
    const long = 'x'.repeat(600);
    const r = parseUploadFailure(long, 502);
    expect(r.kind).toBe('fallback');
    if (r.kind !== 'fallback') throw new Error('expected fallback');
    expect(r.detailText?.length).toBeLessThanOrEqual(500);
    expect(r.detailText?.endsWith('…')).toBe(true);
  });

  it('accepts structured envelope without requestId', () => {
    const body = {
      error: { code: 'VALIDATION_FAILED', message: 'PDF file is required.' },
    };
    const r = parseUploadFailure(body, 400);
    expect(r.kind).toBe('structured');
    if (r.kind !== 'structured') throw new Error('expected structured');
    expect(r.requestId).toBeUndefined();
  });
});

describe('isStructuredErrorEnvelope', () => {
  it('returns false when code or message is not a string', () => {
    expect(isStructuredErrorEnvelope({ error: { code: 1, message: 'x' } })).toBe(
      false,
    );
    expect(isStructuredErrorEnvelope({ error: { code: 'x', message: null } })).toBe(
      false,
    );
  });
});

describe('summarizeUploadFailureForAnnouncement', () => {
  it('stays within max length', () => {
    const failure = parseUploadFailure(
      {
        error: {
          code: 'X'.repeat(400),
          message: 'msg',
          requestId: 'rid',
        },
      },
      422,
    );
    expect(failure.kind).toBe('structured');
    const msg = summarizeUploadFailureForAnnouncement(failure, 120);
    expect(msg.length).toBeLessThanOrEqual(120);
  });
});
