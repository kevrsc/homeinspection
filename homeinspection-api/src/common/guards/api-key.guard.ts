import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfig } from '../../config/configuration';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      get: (name: string) => string | undefined;
    }>();

    const appConfig = getAppConfig(this.configService);
    if (appConfig.authMode === 'mock') {
      const headerValue = request.get(appConfig.mockAuthHeaderName);
      if (headerValue && headerValue === appConfig.mockAuthHeaderValue) {
        return true;
      }
      throw new UnauthorizedException(
        'Missing or invalid mock authentication credentials.',
      );
    }

    const authHeader = request.get('authorization');
    const bearerKey = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : undefined;
    const xApiKey = request.get('x-api-key')?.trim();
    const candidate = bearerKey && bearerKey.length > 0 ? bearerKey : xApiKey;

    if (candidate && appConfig.apiKeys.includes(candidate)) {
      return true;
    }

    throw new UnauthorizedException('Missing or invalid API credentials.');
  }
}
