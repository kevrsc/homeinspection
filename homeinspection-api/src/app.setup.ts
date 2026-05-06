import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  MOCK_AUTH_HEADER_NAME,
  OPENAPI_DOC_PATH,
} from './openapi/upload.openapi';

function createOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle('homeinspection-api')
    .setDescription('OpenAPI contract for v1 report upload endpoint.')
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
  return SwaggerModule.createDocument(app, createOpenApiConfig());
}

export function setupApp(app: INestApplication): void {
  const document = createOpenApiDocument(app);
  SwaggerModule.setup(OPENAPI_DOC_PATH, app, document, {
    jsonDocumentUrl: OPENAPI_DOC_PATH,
    yamlDocumentUrl: undefined,
    ui: false,
  });
}
