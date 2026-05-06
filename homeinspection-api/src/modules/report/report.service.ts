import { Inject, Injectable } from '@nestjs/common';
import {
  PDF_OBSERVATION_EXTRACTOR,
  PdfExtractionResult,
} from './extractors/pdf-observation-extractor.port';
import type { PdfObservationExtractor } from './extractors/pdf-observation-extractor.port';

@Injectable()
export class ReportService {
  constructor(
    @Inject(PDF_OBSERVATION_EXTRACTOR)
    private readonly extractor: PdfObservationExtractor,
  ) {}

  async extractPreview(pdfBuffer: Buffer): Promise<PdfExtractionResult> {
    return this.extractor.extract(pdfBuffer);
  }
}
