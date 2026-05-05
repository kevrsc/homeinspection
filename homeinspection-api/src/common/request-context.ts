import { ExecutionContext } from '@nestjs/common';

/**
 * Returns the correlation id for HTTP contexts. Story 1.4 exception filter should use this
 * (or read `req.requestId` directly) so error JSON matches logs and `X-Request-Id`.
 */
export function getRequestIdFromExecutionContext(
  context: ExecutionContext,
): string {
  if (context.getType() !== 'http') {
    throw new Error(
      'getRequestIdFromExecutionContext requires an HTTP ExecutionContext',
    );
  }
  const req = context.switchToHttp().getRequest<{ requestId?: string }>();
  const id = req.requestId;
  if (id === undefined || id === '') {
    throw new Error(
      'requestId is missing; ensure RequestIdMiddleware is registered for HTTP routes',
    );
  }
  return id;
}
