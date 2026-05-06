export const OPENAPI_DOC_PATH = 'openapi.json';
export const MOCK_AUTH_HEADER_NAME = 'x-mock-auth';

export const uploadErrorSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        requestId: { type: 'string' },
        details: {
          oneOf: [{ type: 'object' }, { type: 'array' }, { type: 'string' }],
        },
      },
      required: ['code', 'message', 'requestId'],
    },
  },
  required: ['error'],
};

export const uploadOpenApiExamples = {
  success: {
    summary: 'Successful extraction response',
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
  validationFailed: {
    summary: 'Validation failure example',
    value: {
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Only PDF uploads are supported.',
        requestId: '00000000-0000-4000-8000-000000000000',
        details: {
          code: 'UPLOAD_PDF_REQUIRED',
        },
      },
    },
  },
  extractionFailed: {
    summary: 'Extraction failure example',
    value: {
      error: {
        code: 'EXTRACTION_FAILED',
        message: 'PDF parsing failed. Please upload a different PDF file.',
        requestId: '00000000-0000-4000-8000-000000000000',
        details: {
          code: 'UPLOAD_PDF_PARSE_FAILED',
          retryable: false,
        },
      },
    },
  },
  extractionTimeout: {
    summary: 'Extraction timeout example',
    value: {
      error: {
        code: 'EXTRACTION_TIMEOUT',
        message:
          'Upload processing timed out. Please retry with a smaller file or try again later.',
        requestId: '00000000-0000-4000-8000-000000000000',
        details: {
          code: 'UPLOAD_PROCESSING_TIMEOUT',
          retryable: true,
          timeoutMs: 30000,
        },
      },
    },
  },
  payloadTooLarge: {
    summary: 'Oversized upload validation example',
    value: {
      error: {
        code: 'VALIDATION_FAILED',
        message: 'File too large',
        requestId: '00000000-0000-4000-8000-000000000000',
      },
    },
  },
  unauthorized: {
    summary: 'Unauthorized example',
    value: {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
        requestId: '00000000-0000-4000-8000-000000000000',
      },
    },
  },
  rateLimited: {
    summary: 'Rate-limited example',
    value: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too Many Requests',
        requestId: '00000000-0000-4000-8000-000000000000',
        details: {
          code: 'RATE_LIMIT_EXCEEDED',
          windowMinutes: 60,
          maxRequests: 2,
        },
      },
    },
  },
};
