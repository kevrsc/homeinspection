import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { validateEnv } from './config/env.validation';
import { ReportModule } from './modules/report/report.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
    }),
    CommonModule,
    ReportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes(
        { path: 'v1/report/upload', method: RequestMethod.POST },
        { path: 'v1/report/summarize', method: RequestMethod.POST },
        { path: 'v1/report/summarize/file', method: RequestMethod.POST },
      );
  }
}
