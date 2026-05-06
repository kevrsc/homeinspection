export type LogOutcome =
  | 'success'
  | 'validation_error'
  | 'extraction_error'
  | 'timeout_error'
  | 'auth_error'
  | 'rate_limit_error'
  | 'internal_error'
  | 'request_error';

export type LogCategory =
  | 'extraction'
  | 'validation'
  | 'timeout'
  | 'auth'
  | 'governance'
  | 'internal'
  | 'request';

export type OutcomeCategory = {
  outcome: LogOutcome;
  category: LogCategory;
};

export function mapStatusToOutcomeCategory(
  statusCode: number,
): OutcomeCategory {
  if (statusCode >= 200 && statusCode < 300) {
    return { outcome: 'success', category: 'extraction' };
  }

  if (statusCode === 400 || statusCode === 413) {
    return { outcome: 'validation_error', category: 'validation' };
  }

  if (statusCode === 422) {
    return { outcome: 'extraction_error', category: 'extraction' };
  }

  if (statusCode === 408) {
    return { outcome: 'timeout_error', category: 'timeout' };
  }

  if (statusCode === 401 || statusCode === 403) {
    return { outcome: 'auth_error', category: 'auth' };
  }

  if (statusCode === 429) {
    return { outcome: 'rate_limit_error', category: 'governance' };
  }

  if (statusCode >= 500) {
    return { outcome: 'internal_error', category: 'internal' };
  }

  return { outcome: 'request_error', category: 'request' };
}
