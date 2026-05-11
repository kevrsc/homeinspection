import { Inject, Injectable } from '@nestjs/common';
import {
  PDF_OBSERVATION_EXTRACTOR,
  PdfExtractionError,
  PdfExtractionResult,
} from './extractors/pdf-observation-extractor.port';
import type { PdfObservationExtractor } from './extractors/pdf-observation-extractor.port';
import { ReportUploadResponseDto } from './dto/extraction-response.dto';
import {
  AI_SUMMARIZER,
  type AiSummarizer,
} from './summarization/ai-summarizer.port';
import type { ObservationSummaryResult } from './summarization/observation-summary.types';

export class UploadProcessingTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`Upload processing exceeded timeout (${timeoutMs}ms).`);
    this.name = 'UploadProcessingTimeoutError';
  }
}

@Injectable()
export class ReportService {
  constructor(
    @Inject(PDF_OBSERVATION_EXTRACTOR)
    private readonly extractor: PdfObservationExtractor,
    @Inject(AI_SUMMARIZER)
    private readonly summarizer: AiSummarizer,
  ) {}

  async summarizeObservations(
    input: ReportUploadResponseDto,
    options?: { signal?: AbortSignal },
  ): Promise<ObservationSummaryResult> {
    return this.summarizer.summarize(input, options);
  }

  /**
   * Single-shot PDF → summary: same extractor path as upload (`extractPreview`),
   * then JSON summarize (`summarizeObservations`).
   */
  async summarizeFromPdfBuffer(
    pdfBuffer: Buffer,
    options?: { signal?: AbortSignal },
  ): Promise<ObservationSummaryResult> {
    const dto = await this.extractPreview(pdfBuffer);
    return this.summarizeObservations(dto, options);
  }

  async extractPreview(pdfBuffer: Buffer): Promise<ReportUploadResponseDto> {
    const timeoutMs = this.getTimeoutMs();
    const extraction = await this.extractWithTimeout(pdfBuffer, timeoutMs);
    return this.toUploadResponse(extraction);
  }

  private async extractWithTimeout(
    pdfBuffer: Buffer,
    timeoutMs: number,
  ): Promise<PdfExtractionResult> {
    return new Promise<PdfExtractionResult>((resolve, reject) => {
      const abortController = new AbortController();
      let settled = false;
      const finish = (handler: () => void): void => {
        if (settled) {
          return;
        }
        settled = true;
        handler();
      };

      const timeoutHandle = setTimeout(() => {
        abortController.abort();
        finish(() => reject(new UploadProcessingTimeoutError(timeoutMs)));
      }, timeoutMs);

      this.extractor
        .extract(pdfBuffer, { signal: abortController.signal })
        .then((result) => {
          finish(() => {
            clearTimeout(timeoutHandle);
            resolve(result);
          });
        })
        .catch((error: unknown) => {
          finish(() => {
            clearTimeout(timeoutHandle);
            if (error instanceof Error) {
              reject(error);
              return;
            }
            reject(new Error('Unknown extraction failure'));
          });
        });
    });
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

  private getTimeoutMs(): number {
    const configuredValue = process.env.UPLOAD_PROCESSING_TIMEOUT_MS ?? '';
    if (/^[1-9]\d*$/.test(configuredValue)) {
      return Number(configuredValue);
    }

    return 30000;
  }
}
