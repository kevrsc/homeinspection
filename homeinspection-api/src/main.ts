import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { getAppConfig } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appConfig = getAppConfig(app.get(ConfigService));
  await app.listen(appConfig.port);
}
void bootstrap();
