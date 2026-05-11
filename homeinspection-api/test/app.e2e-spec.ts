import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, INestApplication, Logger } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { setupApp } from '../src/app.setup';
import { resetRateLimitStateForTests } from '../src/common/middleware/rate-limit.middleware';
import { PdfExtractionError } from '../src/modules/report/extractors/pdf-observation-extractor.port';
import { PDF_OBSERVATION_EXTRACTOR } from '../src/modules/report/extractors/pdf-observation-extractor.port';
import {
  AI_SUMMARIZER,
  SummarizationProviderError,
} from '../src/modules/report/summarization/ai-summarizer.port';
import type { ObservationSummaryResult } from '../src/modules/report/summarization/observation-summary.types';
import { parseAndValidateSummarizeBody } from '../src/modules/report/dto/summarize-request.validation';

@Controller('__e2e')
class E2eThrowController {
  @Get('throw')
  throwUnexpected(): never {
    throw new Error('e2e synthetic failure');
  }
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let extractMock: jest.Mock;
  let summarizeMock: jest.Mock;
  let loggerSpy: jest.SpyInstance;
  const FIXTURES_DIR = join(__dirname, 'fixtures');
  const JSON_FIXTURES_DIR = join(FIXTURES_DIR, 'json');
  const FAILURE_MATRIX_DOC_PATH = join(
    __dirname,
    '..',
    'docs',
    'api',
    'failure-matrix.md',
  );
  const EXPECTED_JSON_FIXTURE_FILES = [
    'upload-success.json',
    'upload-error-validation-missing-file.json',
    'upload-error-validation-type.json',
    'upload-error-validation-size.json',
    'upload-error-auth.json',
    'upload-error-rate-limit.json',
    'upload-error-extraction.json',
    'upload-error-timeout.json',
  ] as const;

  function extractFixtureFileNamesFromFailureMatrix(
    matrixContent: string,
  ): Set<string> {
    const refs = new Set<string>();
    const re = /test\/fixtures\/json\/([\w.-]+\.json)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(matrixContent)) !== null) {
      refs.add(m[1]);
    }
    return refs;
  }

  function assertJsonFixtureContract(
    fixtureName: (typeof EXPECTED_JSON_FIXTURE_FILES)[number],
    parsed: unknown,
  ): void {
    switch (fixtureName) {
      case 'upload-success.json':
        expect(parsed).toEqual({
          pageCount: 1,
          sections: [
            {
              sectionName: 'roof',
              observations: [{ text: 'Damaged shingle near ridge' }],
            },
            {
              sectionName: 'plumbing',
              observations: [{ text: 'Slow leak at shutoff valve' }],
            },
          ],
        });
        return;
      case 'upload-error-validation-missing-file.json':
        expect(parsed).toEqual({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'PDF file is required.',
            requestId: '00000000-0000-4000-8000-000000000000',
            details: { code: 'UPLOAD_FILE_REQUIRED' },
          },
        });
        return;
      case 'upload-error-validation-type.json':
        expect(parsed).toEqual({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Only PDF uploads are supported.',
            requestId: '00000000-0000-4000-8000-000000000000',
            details: { code: 'UPLOAD_PDF_REQUIRED' },
          },
        });
        return;
      case 'upload-error-validation-size.json': {
        expect(parsed).toMatchObject({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Payload Too Large',
            requestId: '00000000-0000-4000-8000-000000000000',
          },
        });
        expect(
          (parsed as { error?: Record<string, unknown> }).error,
        ).not.toHaveProperty('details');
        return;
      }
      case 'upload-error-auth.json': {
        expect(parsed).toMatchObject({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Unauthorized',
            requestId: '00000000-0000-4000-8000-000000000000',
          },
        });
        expect(
          (parsed as { error?: Record<string, unknown> }).error,
        ).not.toHaveProperty('details');
        return;
      }
      case 'upload-error-rate-limit.json':
        expect(parsed).toEqual({
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
        });
        return;
      case 'upload-error-extraction.json':
        expect(parsed).toEqual({
          error: {
            code: 'EXTRACTION_FAILED',
            message: 'PDF parsing failed. Please upload a different PDF file.',
            requestId: '00000000-0000-4000-8000-000000000000',
            details: {
              code: 'UPLOAD_PDF_PARSE_FAILED',
              retryable: false,
            },
          },
        });
        return;
      case 'upload-error-timeout.json':
        expect(parsed).toEqual({
          error: {
            code: 'EXTRACTION_TIMEOUT',
            message:
              'Upload processing timed out. Please retry with a smaller file or try again later.',
            requestId: '00000000-0000-4000-8000-000000000000',
            details: {
              code: 'UPLOAD_PROCESSING_TIMEOUT',
              retryable: true,
              timeoutMs: 20,
            },
          },
        });
        return;
    }
  }
  const PARSE_FAIL_TEXT = 'force-parse-failure';
  const SHAPE_FAIL_TEXT = 'force-shape-failure';
  const TIMEOUT_TEXT = 'force-timeout';
  const previousTimeout = process.env.UPLOAD_PROCESSING_TIMEOUT_MS;
  const validPdfFixture = readFileSync(join(FIXTURES_DIR, 'valid-upload.pdf'));
  const parseFailPdfFixture = readFileSync(
    join(FIXTURES_DIR, 'parse-fail.pdf'),
  );
  const shapeFailPdfFixture = readFileSync(
    join(FIXTURES_DIR, 'shape-fail.pdf'),
  );
  const timeoutPdfFixture = readFileSync(join(FIXTURES_DIR, 'timeout.pdf'));
  const invalidMagicPdfFixture = readFileSync(
    join(FIXTURES_DIR, 'invalid-magic.pdf'),
  );
  const nonPdfTextFixture = readFileSync(join(FIXTURES_DIR, 'not-a-pdf.txt'));

  const summarizeRequestBody: unknown = JSON.parse(
    readFileSync(join(JSON_FIXTURES_DIR, 'upload-success.json'), 'utf8'),
  );

  const e2eMockObservationSummary: ObservationSummaryResult = {
    executiveSummary:
      'E2E mock summary: roof wear and plumbing leak per fixture observations.',
    prioritizedItems: [
      {
        rank: 1,
        title: 'Roof: damaged shingles near ridge',
        rationale:
          'Fixture observation text calls out ridge damage; verify before wet season.',
      },
      {
        rank: 2,
        title: 'Plumbing: slow leak at shutoff',
        rationale:
          'Fixture notes a valve leak; monitor and repair to avoid water damage.',
      },
    ],
  };

  beforeEach(async () => {
    process.env.UPLOAD_PROCESSING_TIMEOUT_MS = '20';
    resetRateLimitStateForTests();
    extractMock = jest.fn((pdfBuffer: Buffer) => {
      if (pdfBuffer.toString('utf8').includes(PARSE_FAIL_TEXT)) {
        return Promise.reject(
          new PdfExtractionError('synthetic malformed pdf'),
        );
      }
      if (pdfBuffer.toString('utf8').includes(SHAPE_FAIL_TEXT)) {
        return Promise.resolve({
          pageCount: 1,
          observations: null,
        });
      }
      if (pdfBuffer.toString('utf8').includes(TIMEOUT_TEXT)) {
        return new Promise<never>(() => {
          // Intentionally unresolved to trigger timeout classification.
        });
      }

      return Promise.resolve({
        pageCount: 1,
        observations: [
          { section: 'roof', text: 'Damaged shingle near ridge' },
          { section: 'plumbing', text: 'Slow leak at shutoff valve' },
        ],
      });
    });

    summarizeMock = jest.fn().mockResolvedValue(e2eMockObservationSummary);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [E2eThrowController],
    })
      .overrideProvider(PDF_OBSERVATION_EXTRACTOR)
      .useValue({ extract: extractMock })
      .overrideProvider(AI_SUMMARIZER)
      .useValue({ summarize: summarizeMock })
      .compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    loggerSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('includes X-Request-Id on GET /', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        const id = res.headers['x-request-id'];
        expect(id).toBeDefined();
        expect(id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
      });
  });

  it('serves openapi contract json aligned to upload route', () => {
    return request(app.getHttpServer())
      .get('/openapi.json')
      .expect(200)
      .expect((res) => {
        const body = res.body as {
          paths?: Record<string, unknown>;
          components?: {
            securitySchemes?: Record<string, unknown>;
            schemas?: Record<string, unknown>;
          };
        };
        const uploadPath = body.paths?.['/v1/report/upload'] as
          | {
              post?: {
                requestBody?: {
                  content?: {
                    'multipart/form-data'?: {
                      schema?: {
                        required?: string[];
                      };
                    };
                  };
                };
                responses?: Record<string, unknown>;
                security?: Array<Record<string, unknown>>;
              };
            }
          | undefined;

        expect(uploadPath).toBeDefined();
        const summarizePath = body.paths?.['/v1/report/summarize'] as
          | {
              post?: {
                requestBody?: {
                  content?: { 'application/json'?: { schema?: unknown } };
                };
                responses?: Record<string, unknown>;
                security?: Array<Record<string, unknown>>;
              };
            }
          | undefined;
        expect(summarizePath?.post).toBeDefined();
        expect(
          summarizePath?.post?.requestBody?.content?.['application/json']
            ?.schema,
        ).toBeDefined();
        expect(summarizePath?.post?.responses?.['200']).toBeDefined();
        expect(summarizePath?.post?.responses?.['502']).toBeDefined();
        expect(uploadPath?.post?.responses?.['200']).toBeDefined();
        expect(uploadPath?.post?.responses?.['400']).toBeDefined();
        expect(uploadPath?.post?.responses?.['401']).toBeDefined();
        expect(uploadPath?.post?.responses?.['408']).toBeDefined();
        expect(uploadPath?.post?.responses?.['413']).toBeDefined();
        expect(uploadPath?.post?.responses?.['422']).toBeDefined();
        expect(uploadPath?.post?.responses?.['429']).toBeDefined();
        expect(
          uploadPath?.post?.requestBody?.content?.['multipart/form-data']
            ?.schema?.required,
        ).toContain('file');
        expect(body.components?.securitySchemes?.mockAuth).toBeDefined();
        expect(body.components?.schemas?.ObservationSummary).toBeDefined();
        expect(
          body.components?.schemas?.PrioritizedObservationItem,
        ).toBeDefined();
        const firstSecurityRequirement = uploadPath?.post?.security?.[0] as
          | { mockAuth?: unknown[] }
          | undefined;
        expect(firstSecurityRequirement?.mockAuth).toBeDefined();
      });
  });

  it('returns 200 with mock observation summary for POST /v1/report/summarize', () => {
    return request(app.getHttpServer())
      .post('/v1/report/summarize')
      .set('x-mock-auth', 'e2e-placeholder-not-a-secret')
      .send(summarizeRequestBody)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        expect(res.body).toEqual(e2eMockObservationSummary);
        expect(summarizeMock).toHaveBeenCalledTimes(1);
        expect(summarizeMock).toHaveBeenCalledWith(
          parseAndValidateSummarizeBody(summarizeRequestBody),
          undefined,
        );
      });
  });

  it('returns 401 for POST /v1/report/summarize without mock auth', () => {
    return request(app.getHttpServer())
      .post('/v1/report/summarize')
      .send(summarizeRequestBody)
      .expect(401)
      .expect((res) => {
        const requestId = res.headers['x-request-id'];
        expect(requestId).toBeDefined();
        expect(res.body).toEqual({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Unauthorized',
            requestId,
          },
        });
      });
  });

  it('maps SummarizationProviderError TIMEOUT to 408 summarize envelope', () => {
    summarizeMock.mockRejectedValueOnce(
      new SummarizationProviderError('TIMEOUT', 'adapter timed out'),
    );
    return request(app.getHttpServer())
      .post('/v1/report/summarize')
      .set('x-mock-auth', 'e2e-placeholder-not-a-secret')
      .send(summarizeRequestBody)
      .expect(408)
      .expect((res) => {
        const requestId = res.headers['x-request-id'];
        expect(requestId).toBeDefined();
        expect(res.body).toEqual({
          error: {
            code: 'SUMMARIZATION_TIMEOUT',
            message: 'Summarization timed out. Please retry later.',
            requestId,
            details: {
              code: 'SUMMARIZATION_TIMEOUT',
              retryable: true,
            },
          },
        });
      });
  });

  it('maps SummarizationProviderError UNREACHABLE to 502 summarize envelope', () => {
    summarizeMock.mockRejectedValueOnce(
      new SummarizationProviderError('UNREACHABLE', 'econnrefused'),
    );
    return request(app.getHttpServer())
      .post('/v1/report/summarize')
      .set('x-mock-auth', 'e2e-placeholder-not-a-secret')
      .send(summarizeRequestBody)
      .expect(502)
      .expect((res) => {
        const requestId = res.headers['x-request-id'];
        expect(requestId).toBeDefined();
        expect(res.body).toEqual({
          error: {
            code: 'SUMMARIZATION_UNAVAILABLE',
            message: 'Summarization service is temporarily unavailable.',
            requestId,
            details: {
              code: 'SUMMARIZATION_UPSTREAM_ERROR',
              providerCode: 'UNREACHABLE',
            },
          },
        });
      });
  });

  it('maps SummarizationProviderError HTTP_ERROR to 502 summarize envelope', () => {
    summarizeMock.mockRejectedValueOnce(
      new SummarizationProviderError('HTTP_ERROR', 'upstream 503'),
    );
    return request(app.getHttpServer())
      .post('/v1/report/summarize')
      .set('x-mock-auth', 'e2e-placeholder-not-a-secret')
      .send(summarizeRequestBody)
      .expect(502)
      .expect((res) => {
        const requestId = res.headers['x-request-id'];
        expect(requestId).toBeDefined();
        expect(res.body).toEqual({
          error: {
            code: 'SUMMARIZATION_UNAVAILABLE',
            message: 'Summarization service is temporarily unavailable.',
            requestId,
            details: {
              code: 'SUMMARIZATION_UPSTREAM_ERROR',
              providerCode: 'HTTP_ERROR',
            },
          },
        });
      });
  });

  it('maps SummarizationProviderError INVALID_RESPONSE to 422 summarize envelope', () => {
    summarizeMock.mockRejectedValueOnce(
      new SummarizationProviderError('INVALID_RESPONSE', 'bad json'),
    );
    return request(app.getHttpServer())
      .post('/v1/report/summarize')
      .set('x-mock-auth', 'e2e-placeholder-not-a-secret')
      .send(summarizeRequestBody)
      .expect(422)
      .expect((res) => {
        const requestId = res.headers['x-request-id'];
        expect(requestId).toBeDefined();
        expect(res.body).toEqual({
          error: {
            code: 'SUMMARIZATION_FAILED',
            message:
              'Summarization could not produce a valid structured response.',
            requestId,
            details: { code: 'SUMMARIZATION_INVALID_RESPONSE' },
          },
        });
      });
  });

  it('publishes parseable JSON fixtures for success and failure classes', () => {
    for (const fixtureName of EXPECTED_JSON_FIXTURE_FILES) {
      const raw = readFileSync(join(JSON_FIXTURES_DIR, fixtureName), 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      expect(typeof parsed).toBe('object');
      expect(parsed).not.toBeNull();
      assertJsonFixtureContract(fixtureName, parsed);
    }
  });

  it('keeps failure matrix fixture references strictly aligned to fixture files', () => {
    const matrixContent = readFileSync(FAILURE_MATRIX_DOC_PATH, 'utf8');
    const docRefs = extractFixtureFileNamesFromFailureMatrix(matrixContent);
    const expected = new Set<string>(EXPECTED_JSON_FIXTURE_FILES);
    expect(docRefs).toEqual(expected);
  });

  it('echoes a valid client X-Request-Id', () => {
    return request(app.getHttpServer())
      .get('/')
      .set('X-Request-Id', 'client-correlation-1')
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-request-id']).toBe('client-correlation-1');
      });
  });

  it('includes X-Request-Id on 404 (unknown route)', () => {
    return request(app.getHttpServer())
      .get('/__e2e_no_such_route__')
      .expect(404)
      .expect((res) => {
        const requestId = res.headers['x-request-id'];
        expect(requestId).toBeDefined();
        expect(requestId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
        expect(res.body).toEqual({
          error: {
            code: 'NOT_FOUND',
            message: 'Not Found',
            requestId,
          },
        });
      });
  });

  it('returns stable envelope on 500 and preserves requestId parity', () => {
    return request(app.getHttpServer())
      .get('/__e2e/throw')
      .expect(500)
      .expect((res) => {
        const requestId = res.headers['x-request-id'];
        expect(requestId).toBeDefined();
        expect(typeof requestId).toBe('string');
        expect(res.body).toEqual({
          error: {
            code: 'INTERNAL_ERROR',
            message:
              'An unexpected error occurred. Please retry or contact support with the requestId.',
            requestId,
          },
        });
      });
  });

  it('returns parse-failed classification for malformed PDF payloads', () => {
    return request(app.getHttpServer())
      .post('/v1/report/upload')
      .set('x-mock-auth', 'e2e-placeholder-not-a-secret')
      .attach('file', parseFailPdfFixture, {
        filename: 'report.pdf',
        contentType: 'application/pdf',
      })
      .expect(422)
      .expect((res) => {
        const requestId = res.headers['x-request-id'];
        expect(requestId).toBeDefined();
        expect(res.body).toEqual({
          error: {
            code: 'EXTRACTION_FAILED',
            message: 'PDF parsing failed. Please upload a different PDF file.',
            requestId,
            details: { code: 'UPLOAD_PDF_PARSE_FAILED', retryable: false },
          },
        });
      });
  });

  it('returns deterministic extraction-failed envelope for invalid extraction shape', () => {
    return request(app.getHttpServer())
      .post('/v1/report/upload')
      .set('x-mock-auth', 'e2e-placeholder-not-a-secret')
      .attach('file', shapeFailPdfFixture, {
        filename: 'shape-fail.pdf',
        contentType: 'application/pdf',
      })
      .expect(422)
      .expect((res) => {
        const requestId = res.headers['x-request-id'];
        expect(requestId).toBeDefined();
        expect(res.body).toEqual({
          error: {
            code: 'EXTRACTION_FAILED',
            message: 'PDF parsing failed. Please upload a different PDF file.',
            requestId,
            details: { code: 'UPLOAD_PDF_PARSE_FAILED', retryable: false },
          },
        });
      });
  });

  it('returns timeout envelope with deterministic timeout classification', () => {
    return request(app.getHttpServer())
      .post('/v1/report/upload')
      .set('x-mock-auth', 'e2e-placeholder-not-a-secret')
      .attach('file', timeoutPdfFixture, {
        filename: 'timeout.pdf',
        contentType: 'application/pdf',
      })
      .expect(408)
      .expect((res) => {
        const requestId = res.headers['x-request-id'];
        expect(requestId).toBeDefined();
        expect(res.body).toEqual({
          error: {
            code: 'EXTRACTION_TIMEOUT',
            message:
              'Upload processing timed out. Please retry with a smaller file or try again later.',
            requestId,
            details: {
              code: 'UPLOAD_PROCESSING_TIMEOUT',
              retryable: true,
              timeoutMs: 20,
            },
          },
        });
      });
  });

  it('returns 200 with section-linked observation payload for valid PDF upload', () => {
    return request(app.getHttpServer())
      .post('/v1/report/upload')
      .set('x-mock-auth', 'e2e-placeholder-not-a-secret')
      .attach('file', validPdfFixture, {
        filename: 'valid.pdf',
        contentType: 'application/pdf',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          pageCount: 1,
          sections: [
            {
              sectionName: 'roof',
              observations: [{ text: 'Damaged shingle near ridge' }],
            },
            {
              sectionName: 'plumbing',
              observations: [{ text: 'Slow leak at shutoff valve' }],
            },
          ],
        });
      });
  });

  it('returns 400 validation envelope when upload file is missing', () => {
    return request(app.getHttpServer())
      .post('/v1/report/upload')
      .set('x-mock-auth', 'e2e-placeholder-not-a-secret')
      .expect(400)
      .expect((res) => {
        const requestId = res.headers['x-request-id'];
        expect(requestId).toBeDefined();
        expect(res.body).toEqual({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'PDF file is required.',
            requestId,
            details: { code: 'UPLOAD_FILE_REQUIRED' },
          },
        });
      });
  });

  it('returns 400 validation envelope for non-PDF upload', () => {
    return request(app.getHttpServer())
      .post('/v1/report/upload')
      .set('x-mock-auth', 'e2e-placeholder-not-a-secret')
      .attach('file', nonPdfTextFixture, {
        filename: 'not-a-pdf.txt',
        contentType: 'text/plain',
      })
      .expect(400)
      .expect((res) => {
        const requestId = res.headers['x-request-id'];
        expect(requestId).toBeDefined();
        expect(res.body).toEqual({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Only PDF uploads are supported.',
            requestId,
            details: { code: 'UPLOAD_PDF_REQUIRED' },
          },
        });
      });
  });

  it('returns 400 validation envelope when magic bytes are not PDF', () => {
    return request(app.getHttpServer())
      .post('/v1/report/upload')
      .set('x-mock-auth', 'e2e-placeholder-not-a-secret')
      .attach('file', invalidMagicPdfFixture, {
        filename: 'fake.pdf',
        contentType: 'application/pdf',
      })
      .expect(400)
      .expect((res) => {
        const requestId = res.headers['x-request-id'];
        expect(requestId).toBeDefined();
        expect(res.body).toEqual({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Only PDF uploads are supported.',
            requestId,
            details: { code: 'UPLOAD_PDF_REQUIRED' },
          },
        });
      });
  });

  it('returns validation classification for oversized upload payloads', () => {
    return request(app.getHttpServer())
      .post('/v1/report/upload')
      .set('x-mock-auth', 'e2e-placeholder-not-a-secret')
      .attach('file', Buffer.alloc(20 * 1024 * 1024 + 1, 0x61), {
        filename: 'oversized.pdf',
        contentType: 'application/pdf',
      })
      .expect(413)
      .expect((res) => {
        expect(res.text).toEqual(
          expect.stringMatching(
            /"error":\{"code":"VALIDATION_FAILED","message":"[^"]+","requestId":"[^"]+"/,
          ),
        );
      });
  });

  it('returns 401 envelope when mock auth header is missing', () => {
    return request(app.getHttpServer())
      .post('/v1/report/upload')
      .expect(401)
      .expect((res) => {
        const requestId = res.headers['x-request-id'];
        expect(requestId).toBeDefined();
        expect(res.body).toEqual({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Unauthorized',
            requestId,
          },
        });
      });
  });

  it('returns 429 with rate-limit classification after configured budget', async () => {
    const server = app.getHttpServer();
    await request(server)
      .post('/v1/report/upload')
      .set('x-mock-auth', 'e2e-placeholder-not-a-secret')
      .attach('file', Buffer.from('not-pdf'), {
        filename: 'first.txt',
        contentType: 'text/plain',
      })
      .expect(400);
    await request(server)
      .post('/v1/report/upload')
      .set('x-mock-auth', 'e2e-placeholder-not-a-secret')
      .attach('file', Buffer.from('still-not-pdf'), {
        filename: 'second.txt',
        contentType: 'text/plain',
      })
      .expect(400);
    await request(server)
      .post('/v1/report/upload')
      .set('x-mock-auth', 'e2e-placeholder-not-a-secret')
      .expect(429)
      .expect((res) => {
        const requestId = res.headers['x-request-id'];
        expect(requestId).toBeDefined();
        expect(res.body).toEqual({
          error: {
            code: 'RATE_LIMITED',
            message: 'Too Many Requests',
            requestId,
            details: {
              code: 'RATE_LIMIT_EXCEEDED',
              windowMinutes: 60,
              maxRequests: 2,
            },
          },
        });
      });
  });

  it('does not treat unversioned /report/upload as supported', () => {
    return request(app.getHttpServer())
      .post('/report/upload')
      .expect(404)
      .expect((res) => {
        const requestId = res.headers['x-request-id'];
        expect(requestId).toBeDefined();
        expect(res.body).toEqual({
          error: {
            code: 'NOT_FOUND',
            message: 'Not Found',
            requestId,
          },
        });
      });
  });

  it('emits structured completion logs for success and representative failures', async () => {
    type CompletionLog = {
      statusCode: number;
      requestId: string;
      outcome: string;
      category: string;
      durationMs: number;
      path: string;
    };
    const parseCompletionLog = (entry: string): CompletionLog =>
      JSON.parse(entry) as CompletionLog;

    loggerSpy.mockClear();
    const server = app.getHttpServer();

    await request(server)
      .post('/v1/report/upload')
      .set('x-mock-auth', 'e2e-placeholder-not-a-secret')
      .attach('file', validPdfFixture, {
        filename: 'valid.pdf',
        contentType: 'application/pdf',
      })
      .expect(200);

    await request(server)
      .post('/v1/report/upload')
      .set('x-mock-auth', 'e2e-placeholder-not-a-secret')
      .expect(400);

    const logCalls = loggerSpy.mock.calls as [unknown, ...unknown[]][];
    const completionLogs = logCalls
      .map((call) => call[0])
      .filter((entry): entry is string => typeof entry === 'string')
      .filter((entry) => entry.includes('"message":"http_request_complete"'))
      .map(parseCompletionLog)
      .filter((entry) => entry.path === '/v1/report/upload');

    const byStatus = new Map<number, (typeof completionLogs)[number]>();
    for (const log of completionLogs) {
      if (!byStatus.has(log.statusCode)) {
        byStatus.set(log.statusCode, log);
      }
    }

    const successLog = byStatus.get(200);
    expect(successLog).toBeDefined();
    expect(successLog?.outcome).toBe('success');
    expect(successLog?.category).toBe('extraction');
    expect(typeof successLog?.requestId).toBe('string');

    const validationLog = byStatus.get(400);
    expect(validationLog).toBeDefined();
    expect(validationLog?.outcome).toBe('validation_error');
    expect(validationLog?.category).toBe('validation');
    expect(typeof validationLog?.requestId).toBe('string');

    for (const log of byStatus.values()) {
      expect(log.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  afterEach(async () => {
    if (previousTimeout === undefined) {
      delete process.env.UPLOAD_PROCESSING_TIMEOUT_MS;
    } else {
      process.env.UPLOAD_PROCESSING_TIMEOUT_MS = previousTimeout;
    }
    loggerSpy.mockRestore();
    await app.close();
  });
});
