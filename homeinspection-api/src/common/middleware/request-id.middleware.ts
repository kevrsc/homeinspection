import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  REQUEST_ID_HEADER_OUTGOING,
  ensureRequestId,
} from '../request-id.util';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const id = ensureRequestId(req);
    // Set early so 404 / guard-short-circuit paths still get the header (interceptor may not run).
    res.setHeader(REQUEST_ID_HEADER_OUTGOING, id);
    next();
  }
}
