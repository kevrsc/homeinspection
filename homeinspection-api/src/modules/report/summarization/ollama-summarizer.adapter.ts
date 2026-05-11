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

/**
 * Resolves `POST …/api/chat` against `LLM_BASE_URL`, preserving non-root path prefixes
 * (reverse proxies, sub-path mounts). Uses relative resolution so the configured pathname
 * is not discarded (unlike `new URL('/api/chat', base)`).
 */
export function buildOllamaChatRequestUrl(baseUrl: string): string {
  const parsed = new URL(baseUrl.trim());
  const href = parsed.href;
  const normalizedBase = href.endsWith('/') ? href : `${href}/`;
  return new URL('api/chat', normalizedBase).href;
}

const DEBUG_LOG_USER_CONTENT_MAX = 2048;
const DEBUG_LOG_HTTP_TEXT_MAX = 2048;
const DEBUG_LOG_ASSISTANT_MAX = 4096;

function truncateForDebugLog(label: string, text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${label}: ${text.length} chars (preview ${max}):\n${text.slice(0, max)}…`;
}

/** Redacts/truncates wire JSON so logs never ship full observation payloads (Story 5.8). */
export function summarizeOllamaChatRequestJsonForDebug(
  bodyJson: string,
): unknown {
  try {
    const parsed = JSON.parse(bodyJson) as Record<string, unknown>;
    const messages = parsed.messages;
    if (!Array.isArray(messages)) {
      return {
        note: 'non-standard body shape for logging',
        length: bodyJson.length,
      };
    }
    return {
      ...parsed,
      messages: messages.map((m: unknown) => {
        if (typeof m !== 'object' || m === null) {
          return m;
        }
        const msg = { ...(m as Record<string, unknown>) };
        if (msg.role === 'user' && typeof msg.content === 'string') {
          msg.content = truncateForDebugLog(
            'user_message',
            msg.content,
            DEBUG_LOG_USER_CONTENT_MAX,
          );
        }
        if (msg.role === 'system' && typeof msg.content === 'string') {
          msg.content = truncateForDebugLog(
            'system_prompt',
            msg.content,
            DEBUG_LOG_USER_CONTENT_MAX,
          );
        }
        return msg;
      }),
    };
  } catch {
    return {
      unparsedBodyLength: bodyJson.length,
      preview: bodyJson.slice(0, 512),
    };
  }
}

@Injectable()
export class OllamaSummarizerAdapter implements AiSummarizer {
  private readonly logger = new Logger(OllamaSummarizerAdapter.name);

  constructor(private readonly config: ConfigService) {}

  /** `LLM_DEBUG_LOG` is validated at bootstrap (`env.validation.ts`); runtime reads normalized `true`/`false`. */
  private isLlmDebugLog(): boolean {
    return this.config.getOrThrow<string>('LLM_DEBUG_LOG') === 'true';
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

      const chatUrl = buildOllamaChatRequestUrl(baseUrl);
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
              body: summarizeOllamaChatRequestJsonForDebug(body),
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
              bodyText: truncateForDebugLog(
                'response_text',
                text,
                DEBUG_LOG_HTTP_TEXT_MAX,
              ),
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
          `[LLM_DEBUG] Assistant content (truncated): ${truncateForDebugLog(
            'assistant_text',
            content,
            DEBUG_LOG_ASSISTANT_MAX,
          )}`,
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
