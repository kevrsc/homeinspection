import { ConfigService } from '@nestjs/config';

export type AuthMode = 'mock' | 'live';

/**
 * camelCase view of validated env (UPPER_SNAKE_CASE in process / ConfigService).
 */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  authMode: AuthMode;
  mockAuthHeaderName: string;
  mockAuthHeaderValue: string;
  apiKeys: string[];
  rateLimitWindowMinutes: number;
  rateLimitMaxRequests: number;
}

export function getAppConfig(configService: ConfigService): AppConfig {
  const authMode = configService.getOrThrow<string>('AUTH_MODE') as AuthMode;
  const apiKeysRaw = configService.get<string>('API_KEYS', '') ?? '';
  return {
    nodeEnv: configService.getOrThrow<string>('NODE_ENV'),
    port: Number(configService.getOrThrow<string>('PORT')),
    authMode,
    mockAuthHeaderName:
      configService.get<string>('MOCK_AUTH_HEADER_NAME', '') ?? '',
    mockAuthHeaderValue:
      configService.get<string>('MOCK_AUTH_HEADER_VALUE', '') ?? '',
    apiKeys: apiKeysRaw
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
    rateLimitWindowMinutes: Number(
      configService.getOrThrow<string>('RATE_LIMIT_WINDOW_MINUTES'),
    ),
    rateLimitMaxRequests: Number(
      configService.getOrThrow<string>('RATE_LIMIT_MAX_REQUESTS'),
    ),
  };
}
