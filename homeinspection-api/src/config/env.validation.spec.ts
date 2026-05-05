import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const baseMock = {
    AUTH_MODE: 'mock',
    MOCK_AUTH_HEADER_NAME: 'x-mock-auth',
    MOCK_AUTH_HEADER_VALUE: 'local-dev-placeholder',
  };

  it('accepts mock mode with defaults for optional keys', () => {
    const result = validateEnv({ ...baseMock });
    expect(result.PORT).toBe('3000');
    expect(result.NODE_ENV).toBe('development');
    expect(result.RATE_LIMIT_WINDOW_MINUTES).toBe('60');
    expect(result.RATE_LIMIT_MAX_REQUESTS).toBe('100');
    expect(result.AUTH_MODE).toBe('mock');
  });

  it('throws naming AUTH_MODE when missing', () => {
    expect(() => validateEnv({})).toThrow(/AUTH_MODE/);
  });

  it('throws naming AUTH_MODE when not mock or live', () => {
    expect(() => validateEnv({ ...baseMock, AUTH_MODE: 'staging' })).toThrow(
      /AUTH_MODE/,
    );
  });

  it('throws naming MOCK_AUTH_HEADER_NAME when mock mode and missing', () => {
    expect(() =>
      validateEnv({
        AUTH_MODE: 'mock',
        MOCK_AUTH_HEADER_VALUE: 'v',
      }),
    ).toThrow(/MOCK_AUTH_HEADER_NAME/);
  });

  it('throws naming MOCK_AUTH_HEADER_VALUE when mock mode and missing', () => {
    expect(() =>
      validateEnv({
        AUTH_MODE: 'mock',
        MOCK_AUTH_HEADER_NAME: 'h',
      }),
    ).toThrow(/MOCK_AUTH_HEADER_VALUE/);
  });

  it('throws naming API_KEYS when live mode and missing', () => {
    expect(() =>
      validateEnv({
        AUTH_MODE: 'live',
        MOCK_AUTH_HEADER_NAME: '',
        MOCK_AUTH_HEADER_VALUE: '',
      }),
    ).toThrow(/API_KEYS/);
  });

  it('throws naming PORT when set to invalid value', () => {
    expect(() => validateEnv({ ...baseMock, PORT: '0' })).toThrow(/PORT/);
    expect(() => validateEnv({ ...baseMock, PORT: '70000' })).toThrow(/PORT/);
    expect(() => validateEnv({ ...baseMock, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('throws naming RATE_LIMIT_WINDOW_MINUTES when set but invalid', () => {
    expect(() =>
      validateEnv({ ...baseMock, RATE_LIMIT_WINDOW_MINUTES: '0' }),
    ).toThrow(/RATE_LIMIT_WINDOW_MINUTES/);
    expect(() =>
      validateEnv({ ...baseMock, RATE_LIMIT_WINDOW_MINUTES: '-1' }),
    ).toThrow(/RATE_LIMIT_WINDOW_MINUTES/);
    expect(() =>
      validateEnv({ ...baseMock, RATE_LIMIT_WINDOW_MINUTES: 'abc' }),
    ).toThrow(/RATE_LIMIT_WINDOW_MINUTES/);
  });

  it('throws naming RATE_LIMIT_MAX_REQUESTS when set but invalid', () => {
    expect(() =>
      validateEnv({ ...baseMock, RATE_LIMIT_MAX_REQUESTS: '0' }),
    ).toThrow(/RATE_LIMIT_MAX_REQUESTS/);
    expect(() =>
      validateEnv({ ...baseMock, RATE_LIMIT_MAX_REQUESTS: 'xyz' }),
    ).toThrow(/RATE_LIMIT_MAX_REQUESTS/);
  });

  it('accepts live mode with API_KEYS', () => {
    const result = validateEnv({
      AUTH_MODE: 'live',
      API_KEYS: 'key-one,key-two',
      MOCK_AUTH_HEADER_NAME: '',
      MOCK_AUTH_HEADER_VALUE: '',
    });
    expect(result.AUTH_MODE).toBe('live');
    expect(result.API_KEYS).toBe('key-one,key-two');
  });
});
