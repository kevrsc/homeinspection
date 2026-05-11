import type { OutcomeCategory } from '../common/interceptors/logging-outcome-map';

declare global {
  namespace Express {
    interface Request {
      /** Set by `RequestIdMiddleware` before route handlers run. */
      requestId: string;
      /** Optional override for `http_request_complete` outcome when status alone is ambiguous (e.g. 422). */
      httpLogOutcomeOverride?: OutcomeCategory;
    }
  }
}

export {};
