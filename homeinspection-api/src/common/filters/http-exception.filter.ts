import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ERROR_CODE_BY_STATUS,
  INTERNAL_ERROR_CODE,
} from '../../shared/errors/error-codes';

export { ERROR_CODE_BY_STATUS };

export const DEFAULT_INTERNAL_ERROR_MESSAGE =
  'An unexpected error occurred. Please retry or contact support with the requestId.';

type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: object | unknown[] | string | null;
  };
};

type BuiltErrorEnvelope = {
  statusCode: number;
  body: ErrorEnvelope;
};

function getMessageAndDetails(response: unknown): {
  message: string;
  details?: object | unknown[] | string | null;
} {
  if (typeof response === 'string') {
    return { message: response };
  }

  if (typeof response !== 'object' || response === null) {
    return { message: 'Request failed' };
  }

  const payload = response as Record<string, unknown>;
  const error = typeof payload.error === 'string' ? payload.error : undefined;
  const messageValue = payload.message;
  const details = payload.details as
    | object
    | unknown[]
    | string
    | null
    | undefined;

  if (Array.isArray(messageValue)) {
    return {
      message: error ?? 'Validation failed',
      details: details ?? messageValue,
    };
  }

  if (typeof messageValue === 'string') {
    return {
      message: error ?? messageValue,
      details,
    };
  }

  if (error) {
    return { message: error, details };
  }

  return { message: 'Request failed', details };
}

function getCodeFromDetails(details: unknown): string | undefined {
  if (!details || typeof details !== 'object') {
    return undefined;
  }

  const detailsObject = details as { code?: unknown };
  return typeof detailsObject.code === 'string'
    ? detailsObject.code
    : undefined;
}

export function buildErrorEnvelope(
  exception: unknown,
  requestId: string,
): BuiltErrorEnvelope {
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const response = exception.getResponse();
    const { message, details } = getMessageAndDetails(response);
    const detailCode = getCodeFromDetails(details);

    const code =
      detailCode === 'UPLOAD_PDF_PARSE_FAILED'
        ? 'EXTRACTION_FAILED'
        : (ERROR_CODE_BY_STATUS[statusCode] ?? INTERNAL_ERROR_CODE);
    return {
      statusCode,
      body: {
        error: {
          code,
          message,
          requestId,
          ...(details !== undefined ? { details } : {}),
        },
      },
    };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    body: {
      error: {
        code: INTERNAL_ERROR_CODE,
        message: DEFAULT_INTERNAL_ERROR_MESSAGE,
        requestId,
      },
    },
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      return;
    }

    const httpHost = host.switchToHttp();
    const response = httpHost.getResponse<Response>();
    const request = httpHost.getRequest<Request>();
    const requestId = request.requestId ?? 'missing-request-id';

    const { statusCode, body } = buildErrorEnvelope(exception, requestId);
    response.status(statusCode).json(body);
  }
}
