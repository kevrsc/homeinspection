import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';

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
    const req = context.switchToHttp().getRequest<Request>();
    const requestId = req.requestId;
    this.logger.log(
      `[requestId=${requestId}] ${req.method} ${req.originalUrl ?? req.url}`,
    );
    return next.handle();
  }
}
