import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ReportUploadResponseDto } from '../dto/extraction-response.dto';
import {
  AiSummarizer,
  SummarizationProviderError,
  SummarizationResult,
} from './ai-summarizer.port';
import { parseObservationSummaryFromAssistantText } from './parse-observation-summary';
import { SUMMARIZATION_SYSTEM_PROMPT } from './summarization-prompt';

@Injectable()
export class OllamaSummarizerAdapter implements AiSummarizer {
  constructor(private readonly config: ConfigService) {}

  async summarize(
    input: ReportUploadResponseDto,
    options?: { signal?: AbortSignal },
  ): Promise<SummarizationResult> {
    const baseUrl = this.config.getOrThrow<string>('LLM_BASE_URL');
    const model = this.config.getOrThrow<string>('LLM_MODEL');
    const timeoutMs = Number(this.config.getOrThrow<string>('LLM_TIMEOUT_MS'));
    const apiKey = this.config.get<string>('LLM_API_KEY', '') ?? '';

    const callerSignal = options?.signal;
    if (callerSignal?.aborted) {
      throw new SummarizationProviderError(
        'TIMEOUT',
        'Summarization was aborted before sending.',
        { cause: callerSignal.reason },
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onCallerAbort = (): void => {
      controller.abort();
    };
    if (callerSignal) {
      callerSignal.addEventListener('abort', onCallerAbort, { once: true });
    }

    const chatUrl = new URL('/api/chat', baseUrl).toString();
    const body = JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: 'system', content: SUMMARIZATION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify(input),
        },
      ],
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey.trim() !== '') {
      headers.Authorization = `Bearer ${apiKey.trim()}`;
    }

    try {
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      const text = await response.text();
      if (!response.ok) {
        throw new SummarizationProviderError(
          'HTTP_ERROR',
          `LLM request failed with HTTP ${response.status}.`,
          { cause: text.slice(0, 500) },
        );
      }

      let data: unknown;
      try {
        data = JSON.parse(text) as unknown;
      } catch (cause) {
        throw new SummarizationProviderError(
          'INVALID_RESPONSE',
          'LLM response was not valid JSON.',
          { cause },
        );
      }

      const content = this.extractAssistantContent(data);
      if (content === undefined) {
        throw new SummarizationProviderError(
          'INVALID_RESPONSE',
          'LLM response missing assistant message content.',
        );
      }

      return parseObservationSummaryFromAssistantText(content);
    } catch (error) {
      if (error instanceof SummarizationProviderError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new SummarizationProviderError(
          'TIMEOUT',
          'LLM request timed out or was aborted.',
          { cause: error },
        );
      }
      throw new SummarizationProviderError(
        'UNREACHABLE',
        error instanceof Error ? error.message : 'LLM request failed.',
        { cause: error },
      );
    } finally {
      clearTimeout(timer);
      if (callerSignal) {
        callerSignal.removeEventListener('abort', onCallerAbort);
      }
    }
  }

  private extractAssistantContent(data: unknown): string | undefined {
    if (typeof data !== 'object' || data === null) {
      return undefined;
    }
    const message = (data as { message?: unknown }).message;
    if (typeof message !== 'object' || message === null) {
      return undefined;
    }
    const content = (message as { content?: unknown }).content;
    if (typeof content !== 'string') {
      return undefined;
    }
    const trimmed = content.trim();
    return trimmed === '' ? undefined : content;
  }
}
