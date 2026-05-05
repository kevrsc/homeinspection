import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { REQUEST_ID_HEADER_OUTGOING } from '../request-id.util';

/**
 * Reinforces `X-Request-Id` on HTTP responses (middleware sets it first for paths where
 * interceptors do not run).
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    res.setHeader(REQUEST_ID_HEADER_OUTGOING, req.requestId);
    return next.handle();
  }
}
