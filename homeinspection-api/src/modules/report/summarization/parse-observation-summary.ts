import { SummarizationProviderError } from './ai-summarizer.port';
import type {
  ObservationSummaryResult,
  PrioritizedObservationItem,
} from './observation-summary.types';

/**
 * Strips thinking/reasoning blocks only from the assistant **prefix** (before the JSON payload).
 * Avoids mutating `</thinking>`-like substrings that appear **inside** JSON string values.
 */
function stripThinkingNoiseInPrefix(prefix: string): string {
  let p = prefix;
  p = p
    .replace(
      /\x3c\x74\x68\x69\x6e\x6b\x3e[\s\S]*?\x3c\/\x74\x68\x69\x6e\x6b\x3e/gi,
      '',
    )
    .trimEnd();
  p = p.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trimEnd();
  p = p.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '').trimEnd();
  p = p
    .replace(
      /\x3c\x72\x65\x64\x61\x63\x74\x65\x64\x5f\x72\x65\x61\x73\x6f\x6e\x69\x6e\x67\x3e[\s\S]*?\x3c\/\x72\x65\x64\x61\x63\x74\x65\x64\x5f\x72\x65\x61\x73\x6f\x6e\x69\x6e\x67\x3e/gi,
      '',
    )
    .trimEnd();
  return p;
}

/** BOM trim + thinking strips on prefix only, then the JSON-bearing suffix unchanged. */
function stripModelNoise(text: string): string {
  const t = text.replace(/^\uFEFF/, '').trimStart();
  const brace = t.indexOf('{');
  const bracket = t.indexOf('[');
  const starts: number[] = [];
  if (brace !== -1) {
    starts.push(brace);
  }
  if (bracket !== -1) {
    starts.push(bracket);
  }
  const jsonStart = starts.length === 0 ? t.length : Math.min(...starts);
  const prefix = t.slice(0, jsonStart);
  const suffix = t.slice(jsonStart);
  return (stripThinkingNoiseInPrefix(prefix) + suffix).trim();
}

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

/**
 * When models wrap JSON in short prose ("Here you go: { ... }"), take the first
 * balanced `{ ... }` slice so `JSON.parse` can succeed.
 */
function extractFirstBalancedJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) {
    return null;
  }
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i += 1) {
    const c = text[i];
    if (c === undefined) {
      break;
    }
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') {
      depth += 1;
    } else if (c === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

/**
 * Some models return `[ { "executiveSummary": ... } ]` instead of a bare object.
 */
function extractFirstBalancedJsonArray(text: string): string | null {
  const start = text.indexOf('[');
  if (start === -1) {
    return null;
  }
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i += 1) {
    const c = text[i];
    if (c === undefined) {
      break;
    }
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '[') {
      depth += 1;
    } else if (c === ']') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

/** Removes trailing commas before `}` or `]` (common LLM JSON drift). Not a full JSON5 parser. */
function repairTrailingCommasInJson(s: string): string {
  let prev = s;
  for (let i = 0; i < 32; i += 1) {
    const next = prev.replace(/,(\s*[\]}])/g, '$1');
    if (next === prev) {
      return next;
    }
    prev = next;
  }
  return prev;
}

function parseJsonObject(text: string): unknown {
  const candidate = stripOptionalMarkdownFence(text);
  const slices: string[] = [];
  const add = (s: string): void => {
    if (!slices.includes(s)) {
      slices.push(s);
    }
    const repaired = repairTrailingCommasInJson(s);
    if (repaired !== s && !slices.includes(repaired)) {
      slices.push(repaired);
    }
  };
  add(candidate);
  const extracted = extractFirstBalancedJsonObject(candidate);
  if (extracted !== null) {
    add(extracted);
  }
  const extractedArr = extractFirstBalancedJsonArray(candidate);
  if (extractedArr !== null) {
    add(extractedArr);
  }

  let lastCause: unknown;
  for (const slice of slices) {
    try {
      return JSON.parse(slice) as unknown;
    } catch (e) {
      lastCause = e;
    }
  }

  throw new SummarizationProviderError(
    'INVALID_RESPONSE',
    'LLM assistant content was not valid JSON for observation summary.',
    { cause: lastCause },
  );
}

function normalizeParsedRoot(parsed: unknown): unknown {
  if (!Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed.length === 1) {
    const only: unknown = parsed[0];
    if (typeof only === 'object' && only !== null) {
      return only;
    }
  }
  for (const el of parsed) {
    if (typeof el === 'object' && el !== null) {
      const r = el as Record<string, unknown>;
      if (
        r.executiveSummary !== undefined ||
        r.ExecutiveSummary !== undefined ||
        r.executive_summary !== undefined
      ) {
        return el;
      }
    }
  }
  return parsed;
}

function pickSummaryFields(obj: Record<string, unknown>): {
  executive: unknown;
  prioritized: unknown;
} {
  const executive =
    obj.executiveSummary ?? obj.ExecutiveSummary ?? obj.executive_summary;
  const prioritized =
    obj.prioritizedItems ??
    obj.PrioritizedItems ??
    obj.prioritized_items ??
    obj.items ??
    obj.priorities;
  return { executive, prioritized };
}

/** Single object `{ rank, title, rationale }` is coerced to a one-element array. */
function resolvePrioritizedRaw(raw: unknown): unknown[] {
  if (raw === undefined || raw === null) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if ('title' in o || 'rationale' in o || 'rank' in o) {
      return [raw];
    }
  }
  throw new SummarizationProviderError(
    'INVALID_RESPONSE',
    'Observation summary prioritizedItems must be an array or a single prioritized item object.',
  );
}

function readExecutiveSummaryWithFallback(value: unknown): {
  executiveSummary: string;
  usedEmptyFallback: boolean;
} {
  if (typeof value === 'string') {
    const t = value.trim();
    if (t.length > 0) {
      return { executiveSummary: t, usedEmptyFallback: false };
    }
    return {
      executiveSummary:
        'No executive summary text was returned. Use the observation list in your report for details.',
      usedEmptyFallback: true,
    };
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { executiveSummary: String(value), usedEmptyFallback: false };
  }
  throw new SummarizationProviderError(
    'INVALID_RESPONSE',
    'Observation summary missing or invalid executiveSummary.',
  );
}

function readNonEmptyItemText(
  value: unknown,
  field: 'title' | 'rationale',
): string {
  if (typeof value === 'string') {
    const t = value.trim();
    if (t.length > 0) {
      return t;
    }
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  throw new SummarizationProviderError(
    'INVALID_RESPONSE',
    `Observation summary item has empty ${field}.`,
  );
}

/** Models often return `""` for rationale; keep a non-empty homeowner-facing string. */
function readRationaleWithFallback(value: unknown, title: string): string {
  if (typeof value === 'string') {
    const t = value.trim();
    if (t.length > 0) {
      return t;
    }
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  } else if (value !== undefined && value !== null) {
    throw new SummarizationProviderError(
      'INVALID_RESPONSE',
      'Observation summary item has invalid rationale type.',
    );
  }

  const trimmedTitle = title.trim();
  if (trimmedTitle.length > 0) {
    return `No separate rationale was returned for “${trimmedTitle}”; confirm against the observation text.`;
  }
  return 'No separate rationale was returned for this item; confirm against the observation text.';
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
    const rankRaw = o.rank;
    let rank: number;
    if (
      typeof rankRaw === 'number' &&
      Number.isFinite(rankRaw) &&
      Number.isInteger(rankRaw) &&
      rankRaw >= 0
    ) {
      rank = rankRaw;
    } else if (typeof rankRaw === 'string') {
      const t = rankRaw.trim();
      const n = Number.parseInt(t, 10);
      if (t !== String(n) || n < 0) {
        throw new SummarizationProviderError(
          'INVALID_RESPONSE',
          'Observation summary item has invalid rank.',
        );
      }
      rank = n;
    } else {
      throw new SummarizationProviderError(
        'INVALID_RESPONSE',
        'Observation summary item has invalid rank.',
      );
    }
    const title = readNonEmptyItemText(o.title, 'title');
    const rationale = readRationaleWithFallback(o.rationale, title);
    items.push({
      rank,
      title,
      rationale,
    });
  }

  return items;
}

/**
 * LLMs often emit 0-based ranks, duplicates, or gaps. Preserve priority order
 * (ascending declared rank, stable for ties) then assign contiguous 1..n.
 */
function normalizePrioritizedRanks(items: PrioritizedObservationItem[]): {
  items: PrioritizedObservationItem[];
  ranksNormalized: boolean;
} {
  if (items.length === 0) {
    return { items: [], ranksNormalized: false };
  }
  const indexed = items.map((item, index) => ({ item, index }));
  indexed.sort((a, b) => {
    if (a.item.rank !== b.item.rank) {
      return a.item.rank - b.item.rank;
    }
    return a.index - b.index;
  });
  let ranksNormalized = false;
  for (let i = 0; i < indexed.length; i += 1) {
    if (indexed[i].item.rank !== i + 1) {
      ranksNormalized = true;
      break;
    }
  }
  if (!ranksNormalized) {
    for (let i = 0; i < indexed.length; i += 1) {
      if (indexed[i].item !== items[i]) {
        ranksNormalized = true;
        break;
      }
    }
  }
  const out = indexed.map(({ item }, index) => ({
    ...item,
    rank: index + 1,
  }));
  return { items: out, ranksNormalized };
}

/**
 * Parses and validates assistant text into {@link ObservationSummaryResult}.
 */
export function parseObservationSummaryFromAssistantText(
  assistantText: string,
): ObservationSummaryResult {
  const cleaned = stripModelNoise(assistantText);
  let parsed: unknown = parseJsonObject(cleaned);
  if (typeof parsed === 'string') {
    parsed = parseJsonObject(parsed.trim());
  }
  parsed = normalizeParsedRoot(parsed);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new SummarizationProviderError(
      'INVALID_RESPONSE',
      'Observation summary JSON must be an object.',
    );
  }
  const obj = parsed as Record<string, unknown>;
  const { executive, prioritized } = pickSummaryFields(obj);
  const { executiveSummary, usedEmptyFallback } =
    readExecutiveSummaryWithFallback(executive);
  const rawList = resolvePrioritizedRaw(prioritized);
  const rawItems = readItems(rawList);
  const { items: normalizedItems, ranksNormalized } =
    normalizePrioritizedRanks(rawItems);
  let prioritizedItems = normalizedItems;
  let ranksNormalizedFlag = ranksNormalized;
  if (usedEmptyFallback && prioritizedItems.length === 0) {
    prioritizedItems = [
      {
        rank: 1,
        title: 'Review raw observations',
        rationale:
          'The model did not return prioritized findings. Use the supplied section observations for details.',
      },
    ];
    ranksNormalizedFlag = false;
  }

  return {
    executiveSummary,
    prioritizedItems,
    ...(ranksNormalizedFlag ? { ranksNormalized: true } : {}),
  };
}
