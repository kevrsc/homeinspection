export type ExtractedObservation = {
  section: string;
  text: string;
};

export type PdfExtractionResult = {
  pageCount: number;
  observations: ExtractedObservation[];
};

export class PdfExtractionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'PdfExtractionError';
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export interface PdfObservationExtractor {
  extract(pdfBuffer: Buffer): Promise<PdfExtractionResult>;
}

export const PDF_OBSERVATION_EXTRACTOR = Symbol('PDF_OBSERVATION_EXTRACTOR');
