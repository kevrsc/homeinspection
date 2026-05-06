import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { getAppConfig } from '../../config/configuration';

const bucketByClient = new Map<string, number[]>();

export function resetRateLimitStateForTests(): void {
  bucketByClient.clear();
}

function getClientKey(request: Request): string {
  const auth = request.header('authorization')?.trim();
  if (auth) {
    return `auth:${auth}`;
  }
  const apiKey = request.header('x-api-key')?.trim();
  if (apiKey) {
    return `x-api-key:${apiKey}`;
  }
  const mockHeader = request.header('x-mock-auth')?.trim();
  if (mockHeader) {
    return `x-mock-auth:${mockHeader}`;
  }
  return `ip:${request.ip}`;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const config = getAppConfig(this.configService);
    const now = Date.now();
    const windowMs = config.rateLimitWindowMinutes * 60 * 1000;
    const cutoff = now - windowMs;
    const key = getClientKey(request);
    const existing = bucketByClient.get(key) ?? [];
    const withinWindow = existing.filter((ts) => ts > cutoff);

    if (withinWindow.length >= config.rateLimitMaxRequests) {
      response.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too Many Requests',
          requestId: request.requestId,
          details: {
            code: 'RATE_LIMIT_EXCEEDED',
            windowMinutes: config.rateLimitWindowMinutes,
            maxRequests: config.rateLimitMaxRequests,
          },
        },
      });
      return;
    }

    withinWindow.push(now);
    bucketByClient.set(key, withinWindow);
    next();
  }
}
