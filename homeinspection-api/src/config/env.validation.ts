function trimValue(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    const s = String(value).trim();
    return s === '' ? undefined : s;
  }
  return undefined;
}

/**
 * Validates env merged by @nestjs/config and returns the same keys with
 * defaults applied. Throws a single Error listing offending variable names.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const errors: string[] = [];
  const out: Record<string, string> = {};

  const authMode = trimValue(config.AUTH_MODE);
  if (!authMode) {
    errors.push('AUTH_MODE');
  } else if (authMode !== 'mock' && authMode !== 'live') {
    errors.push('AUTH_MODE');
  } else {
    out.AUTH_MODE = authMode;
    if (authMode === 'mock') {
      const mockName = trimValue(config.MOCK_AUTH_HEADER_NAME);
      const mockValue = trimValue(config.MOCK_AUTH_HEADER_VALUE);
      if (!mockName) {
        errors.push('MOCK_AUTH_HEADER_NAME');
      } else {
        out.MOCK_AUTH_HEADER_NAME = mockName;
      }
      if (!mockValue) {
        errors.push('MOCK_AUTH_HEADER_VALUE');
      } else {
        out.MOCK_AUTH_HEADER_VALUE = mockValue;
      }
      out.API_KEYS = trimValue(config.API_KEYS) ?? '';
    } else {
      const apiKeys = trimValue(config.API_KEYS);
      if (!apiKeys) {
        errors.push('API_KEYS');
      } else {
        out.API_KEYS = apiKeys;
      }
      out.MOCK_AUTH_HEADER_NAME = trimValue(config.MOCK_AUTH_HEADER_NAME) ?? '';
      out.MOCK_AUTH_HEADER_VALUE =
        trimValue(config.MOCK_AUTH_HEADER_VALUE) ?? '';
    }
  }

  const rawPort = trimValue(config.PORT);
  if (rawPort === undefined) {
    out.PORT = '3000';
  } else {
    const p = Number.parseInt(rawPort, 10);
    if (Number.isNaN(p) || p < 1 || p > 65535) {
      errors.push('PORT');
    } else {
      out.PORT = String(p);
    }
  }

  const nodeEnv = trimValue(config.NODE_ENV);
  out.NODE_ENV = nodeEnv ?? 'development';

  const rawWindow = trimValue(config.RATE_LIMIT_WINDOW_MINUTES);
  if (rawWindow === undefined) {
    out.RATE_LIMIT_WINDOW_MINUTES = '60';
  } else {
    const w = Number.parseInt(rawWindow, 10);
    if (Number.isNaN(w) || w < 1) {
      errors.push('RATE_LIMIT_WINDOW_MINUTES');
    } else {
      out.RATE_LIMIT_WINDOW_MINUTES = String(w);
    }
  }

  const rawMax = trimValue(config.RATE_LIMIT_MAX_REQUESTS);
  if (rawMax === undefined) {
    out.RATE_LIMIT_MAX_REQUESTS = '100';
  } else {
    const m = Number.parseInt(rawMax, 10);
    if (Number.isNaN(m) || m < 1) {
      errors.push('RATE_LIMIT_MAX_REQUESTS');
    } else {
      out.RATE_LIMIT_MAX_REQUESTS = String(m);
    }
  }

  if (errors.length > 0) {
    const unique = [...new Set(errors)];
    throw new Error(
      `Invalid or missing environment variables: ${unique.join(', ')}`,
    );
  }

  return { ...config, ...out };
}
