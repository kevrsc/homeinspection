import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ReportController } from './report.controller';

@Module({
  controllers: [ReportController],
  providers: [ApiKeyGuard],
})
export class ReportModule {}
