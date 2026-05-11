import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import type { OutcomeCategory } from './logging-outcome-map';
import { mapStatusToOutcomeCategory } from './logging-outcome-map';

/**
 * HTTP access-style logging with the same correlation id as response headers.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<Request>();
    const res = httpContext.getResponse<Response>();
    const startedAt = Date.now();

    res.once('finish', () => {
      const statusCode = res.statusCode;
      const reqWithHint = req as Request & {
        httpLogOutcomeOverride?: OutcomeCategory;
      };
      const { outcome, category } =
        reqWithHint.httpLogOutcomeOverride ??
        mapStatusToOutcomeCategory(statusCode);
      const durationMs = Math.max(0, Date.now() - startedAt);
      this.logger.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: statusCode >= 500 ? 'error' : 'info',
          message: 'http_request_complete',
          requestId: req.requestId,
          method: req.method,
          path: req.originalUrl ?? req.url,
          statusCode,
          outcome,
          category,
          durationMs,
        }),
      );
    });

    return next.handle();
  }
}
