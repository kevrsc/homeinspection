import { describe, expect, it } from 'vitest';
import { buildAuthHeaders } from './authHeaders';

describe('buildAuthHeaders', () => {
  it('returns mock headers in mock mode', () => {
    expect(
      buildAuthHeaders({
        authMode: 'mock',
        mockHeaderName: 'X-Mock',
        mockHeaderValue: 'abc',
        apiKey: '',
      }),
    ).toEqual({ 'X-Mock': 'abc' });
  });

  it('trims Bearer token in live mode', () => {
    expect(
      buildAuthHeaders({
        authMode: 'live',
        mockHeaderName: '',
        mockHeaderValue: '',
        apiKey: '  secret  ',
      }),
    ).toEqual({ Authorization: 'Bearer secret' });
  });

  it('throws in live mode when apiKey is empty', () => {
    expect(() =>
      buildAuthHeaders({
        authMode: 'live',
        mockHeaderName: '',
        mockHeaderValue: '',
        apiKey: '',
      }),
    ).toThrow(/refusing to send Authorization: Bearer with an empty token/);
  });

  it('throws in live mode when apiKey is whitespace-only', () => {
    expect(() =>
      buildAuthHeaders({
        authMode: 'live',
        mockHeaderName: '',
        mockHeaderValue: '',
        apiKey: '  \t  ',
      }),
    ).toThrow(/refusing to send Authorization: Bearer with an empty token/);
  });
});
