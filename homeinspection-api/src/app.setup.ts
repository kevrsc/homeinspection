import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  observationSummarySchema,
  prioritizedObservationItemSchema,
} from './openapi/summarization.openapi';
import {
  MOCK_AUTH_HEADER_NAME,
  OPENAPI_DOC_PATH,
} from './openapi/upload.openapi';

function createOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle('homeinspection-api')
    .setDescription(
      'OpenAPI contract for v1 report upload and summarize. Components include ObservationSummary (AI summarization output; Story 5.3).',
    )
    .setVersion('1.0.0')
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: MOCK_AUTH_HEADER_NAME,
      },
      'mockAuth',
    )
    .build();
}

export function createOpenApiDocument(app: INestApplication) {
  const document = SwaggerModule.createDocument(app, createOpenApiConfig());
  document.components ??= {};
  document.components.schemas ??= {};
  document.components.schemas.PrioritizedObservationItem =
    prioritizedObservationItemSchema;
  document.components.schemas.ObservationSummary = observationSummarySchema;
  return document;
}

export function setupApp(app: INestApplication): void {
  const document = createOpenApiDocument(app);
  SwaggerModule.setup(OPENAPI_DOC_PATH, app, document, {
    jsonDocumentUrl: OPENAPI_DOC_PATH,
    yamlDocumentUrl: undefined,
    ui: false,
  });
}
