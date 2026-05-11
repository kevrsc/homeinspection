import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ReportUploadResponseDto } from '../dto/extraction-response.dto';
import {
  AiSummarizer,
  SummarizationProviderError,
  SummarizationResult,
} from './ai-summarizer.port';
import { OLLAMA_OBSERVATION_SUMMARY_FORMAT } from './ollama-observation-summary-format';
import { parseObservationSummaryFromAssistantText } from './parse-observation-summary';
import { SUMMARIZATION_SYSTEM_PROMPT } from './summarization-prompt';

@Injectable()
export class OllamaSummarizerAdapter implements AiSummarizer {
  private readonly logger = new Logger(OllamaSummarizerAdapter.name);

  constructor(private readonly config: ConfigService) {}

  private isLlmDebugLog(): boolean {
    const raw = (this.config.get<string>('LLM_DEBUG_LOG', '') ?? '')
      .trim()
      .toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(raw);
  }

  private sanitizeHeadersForLog(
    headers: Record<string, string>,
  ): Record<string, string> {
    const copy = { ...headers };
    if (copy.Authorization) {
      copy.Authorization = 'Bearer [redacted]';
    }
    return copy;
  }

  async summarize(
    input: ReportUploadResponseDto,
    options?: { signal?: AbortSignal },
  ): Promise<SummarizationResult> {
    const callerSignal = options?.signal;
    if (callerSignal?.aborted) {
      throw new SummarizationProviderError(
        'TIMEOUT',
        'Summarization was aborted before sending.',
        { cause: callerSignal.reason },
      );
    }

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onCallerAbort = (): void => {
      controller.abort();
    };
    if (callerSignal) {
      callerSignal.addEventListener('abort', onCallerAbort, { once: true });
    }

    try {
      const baseUrl = this.config.getOrThrow<string>('LLM_BASE_URL');
      const model = this.config.getOrThrow<string>('LLM_MODEL');
      const timeoutRaw = this.config.getOrThrow<string>('LLM_TIMEOUT_MS');
      const timeoutMs = Number.parseInt(timeoutRaw, 10);
      if (!Number.isFinite(timeoutMs) || timeoutMs < 1) {
        throw new SummarizationProviderError(
          'UNREACHABLE',
          `LLM_TIMEOUT_MS must be a positive integer (milliseconds); received "${timeoutRaw}".`,
        );
      }
      timer = setTimeout(() => controller.abort(), timeoutMs);

      const apiKey = this.config.get<string>('LLM_API_KEY', '') ?? '';

      const chatUrl = new URL('/api/chat', baseUrl).toString();
      const body = JSON.stringify({
        model,
        stream: false,
        /** Structured output schema (stricter than `format: "json"` alone). */
        format: OLLAMA_OBSERVATION_SUMMARY_FORMAT,
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

      if (this.isLlmDebugLog()) {
        this.logger.log(
          `[LLM_DEBUG] Ollama /api/chat request: ${JSON.stringify(
            {
              url: chatUrl,
              method: 'POST',
              headers: this.sanitizeHeadersForLog(headers),
              bodyRaw: body,
            },
            null,
            2,
          )}`,
        );
      }

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      const text = await response.text();

      if (this.isLlmDebugLog()) {
        this.logger.log(
          `[LLM_DEBUG] Ollama /api/chat response: ${JSON.stringify(
            {
              httpStatus: response.status,
              statusText: response.statusText,
              bodyRaw: text,
            },
            null,
            2,
          )}`,
        );
      }

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

      if (this.isLlmDebugLog()) {
        this.logger.log(
          `[LLM_DEBUG] Assistant content string (before observation-summary parse):\n${content}`,
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
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      if (callerSignal) {
        callerSignal.removeEventListener('abort', onCallerAbort);
      }
    }
  }

  private stringifyMessageContent(content: unknown): string | undefined {
    if (typeof content === 'string') {
      const t = content.trim();
      return t === '' ? undefined : t;
    }
    if (
      typeof content === 'object' &&
      content !== null &&
      !Array.isArray(content)
    ) {
      const o = content as Record<string, unknown>;
      for (const key of ['text', 'content', 'value', 'message'] as const) {
        const v = o[key];
        if (typeof v === 'string' && v.trim() !== '') {
          return v.trim();
        }
      }
    }
    if (Array.isArray(content)) {
      const parts: string[] = [];
      for (const part of content) {
        if (typeof part === 'string') {
          parts.push(part);
          continue;
        }
        if (typeof part === 'object' && part !== null) {
          const p = part as Record<string, unknown>;
          if (typeof p.text === 'string') {
            parts.push(p.text);
          } else if (typeof p.content === 'string') {
            parts.push(p.content);
          }
        }
      }
      const joined = parts.join('').trim();
      return joined === '' ? undefined : joined;
    }
    return undefined;
  }

  private contentFromMessage(message: unknown): string | undefined {
    if (typeof message !== 'object' || message === null) {
      return undefined;
    }
    return this.stringifyMessageContent(
      (message as Record<string, unknown>).content,
    );
  }

  /** Ollama `/api/chat` envelope; also tolerates OpenAI-style `choices[0].message`. */
  private extractAssistantContent(data: unknown): string | undefined {
    if (typeof data !== 'object' || data === null) {
      return undefined;
    }
    const root = data as Record<string, unknown>;
    const fromRoot = this.contentFromMessage(root.message);
    if (fromRoot !== undefined) {
      return fromRoot;
    }
    for (const key of ['response', 'output'] as const) {
      const v = root[key];
      if (typeof v === 'string' && v.trim() !== '') {
        return v.trim();
      }
    }
    const choices = root.choices;
    if (Array.isArray(choices) && choices.length > 0) {
      const first: unknown = choices[0];
      if (typeof first === 'object' && first !== null) {
        const fromChoice = this.contentFromMessage(
          (first as Record<string, unknown>).message,
        );
        if (fromChoice !== undefined) {
          return fromChoice;
        }
      }
    }
    return undefined;
  }
}
