import { describe, expect, it } from 'vitest';
import { normalizeApiBase, uploadEndpoint } from './config';

describe('normalizeApiBase', () => {
  it('returns empty for undefined or blank', () => {
    expect(normalizeApiBase(undefined)).toBe('');
    expect(normalizeApiBase('')).toBe('');
  });

  it('strips trailing slashes', () => {
    expect(normalizeApiBase('http://localhost:3000')).toBe('http://localhost:3000');
    expect(normalizeApiBase('http://localhost:3000/')).toBe('http://localhost:3000');
    expect(normalizeApiBase('http://localhost:3000///')).toBe('http://localhost:3000');
  });
});

describe('uploadEndpoint', () => {
  it('uses relative path when base empty', () => {
    expect(uploadEndpoint('')).toBe('/v1/report/upload');
  });

  it('prefixes absolute base', () => {
    expect(uploadEndpoint('http://localhost:3000')).toBe(
      'http://localhost:3000/v1/report/upload',
    );
  });
});
