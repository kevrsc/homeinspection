import {
  REQUEST_ID_HEADER_INCOMING,
  REQUEST_ID_MAX_LENGTH,
  resolveRequestIdFromHeaders,
} from './request-id.util';

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('resolveRequestIdFromHeaders', () => {
  it('returns trimmed client id when header is non-empty', () => {
    expect(
      resolveRequestIdFromHeaders({
        [REQUEST_ID_HEADER_INCOMING]: '  client-id  ',
      }),
    ).toBe('client-id');
  });

  it('uses first value when header is an array', () => {
    expect(
      resolveRequestIdFromHeaders({
        [REQUEST_ID_HEADER_INCOMING]: ['first', 'second'],
      }),
    ).toBe('first');
  });

  it('generates a UUID v4 when header is absent', () => {
    expect(resolveRequestIdFromHeaders({})).toMatch(UUID_V4_RE);
  });

  it('generates a UUID v4 when header is whitespace-only', () => {
    expect(
      resolveRequestIdFromHeaders({ [REQUEST_ID_HEADER_INCOMING]: '   \t  ' }),
    ).toMatch(UUID_V4_RE);
  });

  it('generates a UUID when trimmed header exceeds max length', () => {
    const tooLong = 'a'.repeat(REQUEST_ID_MAX_LENGTH + 1);
    expect(
      resolveRequestIdFromHeaders({
        [REQUEST_ID_HEADER_INCOMING]: tooLong,
      }),
    ).toMatch(UUID_V4_RE);
  });
});
