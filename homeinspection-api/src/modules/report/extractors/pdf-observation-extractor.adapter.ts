import {
  PdfExtractionError,
  PdfExtractionResult,
  PdfObservationExtractor,
} from './pdf-observation-extractor.port';
import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class PdfObservationExtractorAdapter implements PdfObservationExtractor {
  async extract(
    pdfBuffer: Buffer,
    options?: { signal?: AbortSignal },
  ): Promise<PdfExtractionResult> {
    const parser = new PDFParse({ data: pdfBuffer });
    if (options?.signal?.aborted) {
      await parser.destroy();
      throw new PdfExtractionError('PDF extraction aborted.');
    }
    try {
      const abortPromise = new Promise<never>((_, reject) => {
        options?.signal?.addEventListener(
          'abort',
          () => reject(new PdfExtractionError('PDF extraction aborted.')),
          { once: true },
        );
      });
      const parsed = await Promise.race([parser.getText(), abortPromise]);
      const lines = parsed.text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      return {
        pageCount: parsed.total,
        observations: lines.map((text: string) => ({
          section: 'general',
          text,
        })),
      };
    } catch (error) {
      throw new PdfExtractionError('Failed to parse PDF document.', {
        cause: error,
      });
    } finally {
      await parser.destroy();
    }
  }
}
