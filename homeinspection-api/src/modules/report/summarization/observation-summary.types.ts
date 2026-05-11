/**
 * Structured LLM output for observation summarization (Epic 5).
 * OpenAPI components mirror this shape in `openapi/summarization.openapi.ts`.
 */
export type PrioritizedObservationItem = {
  /** 1-based priority order; must run 1..n with no gaps when sorted. */
  rank: number;
  /** Short headline for the finding or theme. */
  title: string;
  /** Why this matters or what to do next, grounded in supplied observations. */
  rationale: string;
};

export type ObservationSummaryResult = {
  executiveSummary: string;
  prioritizedItems: PrioritizedObservationItem[];
  /**
   * True when the server re-sorted or renumbered `prioritizedItems` ranks to contiguous 1..n
   * (Story 5.9). Omitted when the model output already matched that shape and order.
   */
  ranksNormalized?: boolean;
};
