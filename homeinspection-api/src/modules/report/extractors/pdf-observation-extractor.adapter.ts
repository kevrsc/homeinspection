import {
  PdfExtractionError,
  PdfExtractionResult,
  PdfObservationExtractor,
} from './pdf-observation-extractor.port';
import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class PdfObservationExtractorAdapter implements PdfObservationExtractor {
  async extract(pdfBuffer: Buffer): Promise<PdfExtractionResult> {
    const parser = new PDFParse({ data: pdfBuffer });
    try {
      const parsed = await parser.getText();
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
