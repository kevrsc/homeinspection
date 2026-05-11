import { HttpException } from '@nestjs/common';

export type LogOutcome =
  | 'success'
  | 'validation_error'
  | 'extraction_error'
  | 'summarization_error'
  | 'timeout_error'
  | 'auth_error'
  | 'rate_limit_error'
  | 'internal_error'
  | 'request_error';

export type LogCategory =
  | 'extraction'
  | 'validation'
  | 'summarization'
  | 'timeout'
  | 'auth'
  | 'governance'
  | 'internal'
  | 'request';

export type OutcomeCategory = {
  outcome: LogOutcome;
  category: LogCategory;
};

function detailCodeFromHttpException(
  exception: HttpException,
): string | undefined {
  const raw = exception.getResponse();
  if (typeof raw !== 'object' || raw === null) {
    return undefined;
  }
  const details = (raw as { details?: unknown }).details;
  if (!details || typeof details !== 'object') {
    return undefined;
  }
  const code = (details as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * When HTTP status alone is ambiguous (e.g. 422 is both extraction and summarization),
 * derive a log outcome from the exception payload set by controllers / filters.
 */
export function inferHttpLogOutcomeHint(
  exception: unknown,
): OutcomeCategory | undefined {
  if (!(exception instanceof HttpException)) {
    return undefined;
  }
  const status = exception.getStatus();
  const detail = detailCodeFromHttpException(exception);
  if (status === 422) {
    if (detail === 'SUMMARIZATION_INVALID_RESPONSE') {
      return { outcome: 'summarization_error', category: 'summarization' };
    }
    if (detail === 'UPLOAD_PDF_PARSE_FAILED') {
      return { outcome: 'extraction_error', category: 'extraction' };
    }
  }
  return undefined;
}

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
