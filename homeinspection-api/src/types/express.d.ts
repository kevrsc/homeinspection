declare global {
  namespace Express {
    interface Request {
      /** Set by `RequestIdMiddleware` before route handlers run. */
      requestId: string;
    }
  }
}

export {};
