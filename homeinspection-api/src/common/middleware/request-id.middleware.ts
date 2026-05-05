import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  REQUEST_ID_HEADER_OUTGOING,
  resolveRequestIdFromHeaders,
} from '../request-id.util';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    req.requestId = resolveRequestIdFromHeaders(req.headers);
    // Set early so 404 / guard-short-circuit paths still get the header (interceptor may not run).
    res.setHeader(REQUEST_ID_HEADER_OUTGOING, req.requestId);
    next();
  }
}
