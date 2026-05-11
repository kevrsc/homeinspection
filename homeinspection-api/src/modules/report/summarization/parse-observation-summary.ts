import { SummarizationProviderError } from './ai-summarizer.port';
import type {
  ObservationSummaryResult,
  PrioritizedObservationItem,
} from './observation-summary.types';

function stripOptionalMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const fenceStart = /^```(?:json)?\s*\r?\n?/i.exec(trimmed);
  if (!fenceStart) {
    return trimmed;
  }
  const afterOpen = trimmed.slice(fenceStart[0].length);
  const closeIdx = afterOpen.lastIndexOf('```');
  if (closeIdx === -1) {
    return trimmed;
  }
  return afterOpen.slice(0, closeIdx).trim();
}

function parseJsonObject(text: string): unknown {
  const candidate = stripOptionalMarkdownFence(text);
  try {
    return JSON.parse(candidate) as unknown;
  } catch (cause) {
    throw new SummarizationProviderError(
      'INVALID_RESPONSE',
      'LLM assistant content was not valid JSON for observation summary.',
      { cause },
    );
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function readItems(raw: unknown): PrioritizedObservationItem[] {
  if (!Array.isArray(raw)) {
    throw new SummarizationProviderError(
      'INVALID_RESPONSE',
      'Observation summary JSON missing prioritizedItems array.',
    );
  }

  const items: PrioritizedObservationItem[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const el: unknown = raw[i];
    if (typeof el !== 'object' || el === null) {
      throw new SummarizationProviderError(
        'INVALID_RESPONSE',
        'Observation summary prioritizedItems entry is not an object.',
      );
    }
    const o = el as Record<string, unknown>;
    const rank = o.rank;
    const title = o.title;
    const rationale = o.rationale;
    if (
      typeof rank !== 'number' ||
      !Number.isFinite(rank) ||
      !Number.isInteger(rank) ||
      rank < 1
    ) {
      throw new SummarizationProviderError(
        'INVALID_RESPONSE',
        'Observation summary item has invalid rank.',
      );
    }
    if (!isNonEmptyString(title) || !isNonEmptyString(rationale)) {
      throw new SummarizationProviderError(
        'INVALID_RESPONSE',
        'Observation summary item has empty title or rationale.',
      );
    }
    items.push({
      rank,
      title: title.trim(),
      rationale: rationale.trim(),
    });
  }

  return items;
}

function validateRankSequence(items: PrioritizedObservationItem[]): void {
  if (items.length === 0) {
    return;
  }
  const sorted = [...items].sort((a, b) => a.rank - b.rank);
  for (let i = 0; i < sorted.length; i += 1) {
    if (sorted[i].rank !== i + 1) {
      throw new SummarizationProviderError(
        'INVALID_RESPONSE',
        'Observation summary ranks must be 1..n with no gaps or duplicates.',
      );
    }
  }
}

/**
 * Parses and validates assistant text into {@link ObservationSummaryResult}.
 */
export function parseObservationSummaryFromAssistantText(
  assistantText: string,
): ObservationSummaryResult {
  const parsed = parseJsonObject(assistantText);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new SummarizationProviderError(
      'INVALID_RESPONSE',
      'Observation summary JSON must be an object.',
    );
  }
  const obj = parsed as Record<string, unknown>;
  const executiveSummary = obj.executiveSummary;
  if (!isNonEmptyString(executiveSummary)) {
    throw new SummarizationProviderError(
      'INVALID_RESPONSE',
      'Observation summary missing or empty executiveSummary.',
    );
  }
  const prioritizedItems = readItems(obj.prioritizedItems);
  validateRankSequence(prioritizedItems);
  const prioritizedItemsOrdered = [...prioritizedItems].sort(
    (a, b) => a.rank - b.rank,
  );

  return {
    executiveSummary: executiveSummary.trim(),
    prioritizedItems: prioritizedItemsOrdered,
  };
}
