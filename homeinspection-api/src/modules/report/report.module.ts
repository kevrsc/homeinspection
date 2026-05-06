import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { PdfObservationExtractorAdapter } from './extractors/pdf-observation-extractor.adapter';
import { PDF_OBSERVATION_EXTRACTOR } from './extractors/pdf-observation-extractor.port';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  controllers: [ReportController],
  providers: [
    ApiKeyGuard,
    ReportService,
    {
      provide: PDF_OBSERVATION_EXTRACTOR,
      useClass: PdfObservationExtractorAdapter,
    },
  ],
})
export class ReportModule {}
