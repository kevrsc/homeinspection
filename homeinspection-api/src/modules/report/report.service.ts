import { Inject, Injectable } from '@nestjs/common';
import {
  PDF_OBSERVATION_EXTRACTOR,
  PdfExtractionError,
  PdfExtractionResult,
} from './extractors/pdf-observation-extractor.port';
import type { PdfObservationExtractor } from './extractors/pdf-observation-extractor.port';
import { ReportUploadResponseDto } from './dto/extraction-response.dto';

@Injectable()
export class ReportService {
  constructor(
    @Inject(PDF_OBSERVATION_EXTRACTOR)
    private readonly extractor: PdfObservationExtractor,
  ) {}

  async extractPreview(pdfBuffer: Buffer): Promise<ReportUploadResponseDto> {
    const extraction = await this.extractor.extract(pdfBuffer);
    return this.toUploadResponse(extraction);
  }

  private toUploadResponse(extraction: unknown): ReportUploadResponseDto {
    if (!this.isValidExtractionResult(extraction)) {
      throw new PdfExtractionError('Extractor returned an invalid payload.');
    }

    const sections = new Map<string, string[]>();

    for (const observation of extraction.observations) {
      const sectionName = this.normalizeSectionName(observation.section);
      const bucket = sections.get(sectionName);

      if (bucket) {
        bucket.push(observation.text);
        continue;
      }

      sections.set(sectionName, [observation.text]);
    }

    return {
      pageCount: extraction.pageCount,
      // Sections preserve first-seen order from extractor observations.
      sections: Array.from(sections.entries()).map(([sectionName, texts]) => ({
        sectionName,
        observations: texts.map((text) => ({ text })),
      })),
    };
  }

  private normalizeSectionName(section: string): string {
    const normalized = section.trim();
    return normalized.length > 0 ? normalized : 'general';
  }

  private isValidExtractionResult(
    value: unknown,
  ): value is PdfExtractionResult {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<PdfExtractionResult>;
    if (
      typeof candidate.pageCount !== 'number' ||
      !Number.isFinite(candidate.pageCount)
    ) {
      return false;
    }

    if (!Array.isArray(candidate.observations)) {
      return false;
    }

    return candidate.observations.every((observation) => {
      if (!observation || typeof observation !== 'object') {
        return false;
      }

      const item = observation as { section?: unknown; text?: unknown };
      return (
        typeof item.section === 'string' &&
        typeof item.text === 'string' &&
        item.text.trim().length > 0
      );
    });
  }
}
