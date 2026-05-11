export type PrioritizedObservationItem = {
  rank: number;
  title: string;
  rationale: string;
};

export type ObservationSummary = {
  executiveSummary: string;
  prioritizedItems: PrioritizedObservationItem[];
};

export type ParseObservationSummaryResult =
  | { ok: true; data: ObservationSummary }
  | { ok: false };

function parsePrioritizedItem(raw: unknown): PrioritizedObservationItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const rank = o.rank;
  const title = o.title;
  const rationale = o.rationale;
  if (
    typeof rank !== 'number' ||
    !Number.isInteger(rank) ||
    rank < 1 ||
    typeof title !== 'string' ||
    typeof rationale !== 'string'
  ) {
    return null;
  }
  return { rank, title, rationale };
}

/** Runtime narrow for `ObservationSummary` (OpenAPI success body for summarize). */
export function parseObservationSummary(
  json: unknown,
): ParseObservationSummaryResult {
  if (!json || typeof json !== 'object') {
    return { ok: false };
  }
  const root = json as Record<string, unknown>;
  if (typeof root.executiveSummary !== 'string') {
    return { ok: false };
  }
  if (!Array.isArray(root.prioritizedItems)) {
    return { ok: false };
  }
  const prioritizedItems: PrioritizedObservationItem[] = [];
  for (const item of root.prioritizedItems) {
    const parsed = parsePrioritizedItem(item);
    if (!parsed) return { ok: false };
    prioritizedItems.push(parsed);
  }
  return {
    ok: true,
    data: {
      executiveSummary: root.executiveSummary,
      prioritizedItems,
    },
  };
}
