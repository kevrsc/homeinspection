import type { ReportUploadResponseDto } from '../dto/extraction-response.dto';
import type { ObservationSummaryResult } from './observation-summary.types';

export type SummarizationResult = ObservationSummaryResult;
export type {
  ObservationSummaryResult,
  PrioritizedObservationItem,
} from './observation-summary.types';

export type SummarizationErrorCode =
  | 'UNREACHABLE'
  | 'HTTP_ERROR'
  | 'INVALID_RESPONSE'
  | 'TIMEOUT';

export class SummarizationProviderError extends Error {
  readonly code: SummarizationErrorCode;

  constructor(
    code: SummarizationErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = 'SummarizationProviderError';
    this.code = code;
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export interface AiSummarizer {
  summarize(
    input: ReportUploadResponseDto,
    options?: { signal?: AbortSignal },
  ): Promise<SummarizationResult>;
}

export const AI_SUMMARIZER = Symbol('AI_SUMMARIZER');
