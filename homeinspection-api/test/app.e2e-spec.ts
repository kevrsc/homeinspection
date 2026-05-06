import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { resetRateLimitStateForTests } from '../src/common/middleware/rate-limit.middleware';

@Controller('__e2e')
class E2eThrowController {
  @Get('throw')
  throwUnexpected(): never {
    throw new Error('e2e synthetic failure');
  }
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    resetRateLimitStateForTests();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [E2eThrowController],
    }).compile();

    app = moduleFixture.createNestApplication();
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

  it('exposes POST /v1/report/upload as a non-404 route shell', () => {
    return request(app.getHttpServer())
      .post('/v1/report/upload')
      .set('x-mock-auth', 'e2e-placeholder-not-a-secret')
      .attach('file', Buffer.from('%PDF-1.4\n% mock e2e pdf\n'), {
        filename: 'report.pdf',
        contentType: 'application/pdf',
      })
      .expect(400)
      .expect((res) => {
        const requestId = res.headers['x-request-id'];
        expect(requestId).toBeDefined();
        expect(res.body).toEqual({
          error: {
            code: 'VALIDATION_FAILED',
            message:
              'Upload shell endpoint is active. File processing is not implemented yet.',
            requestId,
            details: { code: 'UPLOAD_SHELL_ONLY' },
          },
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
      .attach('file', Buffer.from('plain text'), {
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
      .attach('file', Buffer.from('NOTPDF-bytes'), {
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

  afterEach(async () => {
    await app.close();
  });
});
