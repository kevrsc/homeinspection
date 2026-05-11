/**
 * OpenAPI 3 schema fragments for AI observation summary (Story 5.3).
 * Merged into the generated document in `app.setup.ts` until Story 5.4
 * exposes a live summarize route in the spec.
 */
export const prioritizedObservationItemSchema = {
  type: 'object',
  required: ['rank', 'title', 'rationale'],
  properties: {
    rank: {
      type: 'integer',
      minimum: 1,
      description: '1-based priority; sequence must be contiguous when sorted.',
    },
    title: { type: 'string', description: 'Short headline.' },
    rationale: {
      type: 'string',
      description: 'Why this matters, grounded in supplied observations.',
    },
  },
};

export const observationSummarySchema = {
  type: 'object',
  required: ['executiveSummary', 'prioritizedItems'],
  properties: {
    executiveSummary: {
      type: 'string',
      description: 'High-level narrative for the homeowner.',
    },
    prioritizedItems: {
      type: 'array',
      items: { $ref: '#/components/schemas/PrioritizedObservationItem' },
    },
  },
};

/** Request body for `POST /v1/report/summarize` — same shape as upload success (Story 5.4). */
export const summarizeRequestBodyOpenApiSchema = {
  type: 'object',
  required: ['pageCount', 'sections'],
  properties: {
    pageCount: { type: 'integer', minimum: 0 },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        required: ['sectionName', 'observations'],
        properties: {
          sectionName: { type: 'string' },
          observations: {
            type: 'array',
            items: {
              type: 'object',
              required: ['text'],
              properties: { text: { type: 'string' } },
            },
          },
        },
      },
    },
  },
};

export const summarizeOpenApiExamples = {
  requestBody: {
    summary: 'Observations payload (same as upload success)',
    value: {
      pageCount: 1,
      sections: [
        {
          sectionName: 'roof',
          observations: [{ text: 'Damaged shingle near ridge' }],
        },
      ],
    },
  },
  bodyInvalid: {
    summary: 'Summarize body validation (e.g. empty sectionName)',
    value: {
      error: {
        code: 'VALIDATION_FAILED',
        message: 'sectionName must not be empty or whitespace-only.',
        requestId: '00000000-0000-4000-8000-000000000000',
        details: { code: 'SUMMARIZATION_BODY_INVALID' },
      },
    },
  },
  summarizationInvalid: {
    summary: 'Summarization invalid model output',
    value: {
      error: {
        code: 'SUMMARIZATION_FAILED',
        message: 'Summarization could not produce a valid structured response.',
        requestId: '00000000-0000-4000-8000-000000000000',
        details: { code: 'SUMMARIZATION_INVALID_RESPONSE' },
      },
    },
  },
  summarizationTimeout: {
    summary: 'Summarization timeout',
    value: {
      error: {
        code: 'SUMMARIZATION_TIMEOUT',
        message: 'Summarization timed out. Please retry later.',
        requestId: '00000000-0000-4000-8000-000000000000',
        details: {
          code: 'SUMMARIZATION_TIMEOUT',
          retryable: true,
        },
      },
    },
  },
  summarizationUnavailable: {
    summary: 'Summarization upstream unavailable',
    value: {
      error: {
        code: 'SUMMARIZATION_UNAVAILABLE',
        message: 'Summarization service is temporarily unavailable.',
        requestId: '00000000-0000-4000-8000-000000000000',
        details: {
          code: 'SUMMARIZATION_UPSTREAM_ERROR',
          providerCode: 'UNREACHABLE',
        },
      },
    },
  },
};

export const observationSummaryOpenApiExample = {
  executiveSummary:
    'The roof section shows localized wear; plumbing was not flagged in the supplied observations.',
  prioritizedItems: [
    {
      rank: 1,
      title: 'Roof: damaged shingles near ridge',
      rationale:
        'Observation text notes missing shingles at the ridge; address before wet season to reduce leak risk.',
    },
    {
      rank: 2,
      title: 'Document remaining sections with your contractor',
      rationale:
        'Only roof observations were provided; verify other systems with a walkthrough.',
    },
  ],
};
