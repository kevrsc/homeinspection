/**
 * JSON Schema for Ollama `/api/chat` `format` (structured outputs).
 * Steers the model toward the exact observation-summary shape.
 *
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md
 */
export const OLLAMA_OBSERVATION_SUMMARY_FORMAT = {
  type: 'object',
  properties: {
    executiveSummary: {
      type: 'string',
      /** Ollama structured outputs: reject degenerate empty summaries at generation time. */
      minLength: 1,
    },
    prioritizedItems: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          rank: { type: 'integer', minimum: 0 },
          title: { type: 'string', minLength: 1 },
          rationale: { type: 'string' },
        },
        required: ['rank', 'title', 'rationale'],
      },
    },
  },
  required: ['executiveSummary', 'prioritizedItems'],
} as const;
