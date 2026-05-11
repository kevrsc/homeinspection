/**
 * OpenAPI 3 schema fragments for AI observation summary (Story 5.3).
 * Merged into the generated document in `app.setup.ts` alongside live
 * `POST /v1/report/summarize` and `POST /v1/report/summarize/file` routes.
 */
import {
  SUMMARIZE_MAX_OBSERVATION_TEXT_LENGTH,
  SUMMARIZE_MAX_OBSERVATIONS_PER_SECTION,
  SUMMARIZE_MAX_PAGE_COUNT,
  SUMMARIZE_MAX_SECTION_NAME_LENGTH,
  SUMMARIZE_MAX_SECTIONS,
} from '../modules/report/dto/summarize-request.validation';

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
    ranksNormalized: {
      type: 'boolean',
      description:
        'Present and true when item ranks were re-sorted or renumbered to contiguous 1..n (Story 5.9). Omitted when model ranks were already in priority order.',
    },
  },
};

/** Request body for `POST /v1/report/summarize` — same shape as upload success (Story 5.4). */
export const summarizeRequestBodyOpenApiSchema = {
  type: 'object',
  required: ['pageCount', 'sections'],
  properties: {
    pageCount: {
      type: 'integer',
      minimum: 0,
      maximum: SUMMARIZE_MAX_PAGE_COUNT,
    },
    sections: {
      type: 'array',
      maxItems: SUMMARIZE_MAX_SECTIONS,
      items: {
        type: 'object',
        required: ['sectionName', 'observations'],
        properties: {
          sectionName: {
            type: 'string',
            minLength: 1,
            maxLength: SUMMARIZE_MAX_SECTION_NAME_LENGTH,
          },
          observations: {
            type: 'array',
            maxItems: SUMMARIZE_MAX_OBSERVATIONS_PER_SECTION,
            items: {
              type: 'object',
              required: ['text'],
              properties: {
                text: {
                  type: 'string',
                  minLength: 1,
                  maxLength: SUMMARIZE_MAX_OBSERVATION_TEXT_LENGTH,
                },
              },
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
  bodyLimitExceeded: {
    summary: 'Summarize body over configured size/count caps (Story 5.7)',
    value: {
      error: {
        code: 'VALIDATION_FAILED',
        message: 'sections must contain at most 80 entries.',
        requestId: '00000000-0000-4000-8000-000000000000',
        details: {
          code: 'SUMMARIZATION_BODY_LIMIT_EXCEEDED',
          field: 'sections',
          max: 80,
        },
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
