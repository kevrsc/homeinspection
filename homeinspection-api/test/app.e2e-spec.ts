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
  let loggerSpy: jest.SpyInstance;
  const FIXTURES_DIR = join(__dirname, 'fixtures');
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

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [E2eThrowController],
    })
      .overrideProvider(PDF_OBSERVATION_EXTRACTOR)
      .useValue({ extract: extractMock })
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
        const firstSecurityRequirement = uploadPath?.post?.security?.[0] as
          | { mockAuth?: unknown[] }
          | undefined;
        expect(firstSecurityRequirement?.mockAuth).toBeDefined();
      });
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
