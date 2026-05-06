import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { createOpenApiDocument } from '../src/app.setup';
import { OPENAPI_DOC_PATH } from '../src/openapi/upload.openapi';

async function run(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = createOpenApiDocument(app);
  const outputPath = resolve(process.cwd(), 'openapi', OPENAPI_DOC_PATH);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(document, null, 2), {
    encoding: 'utf8',
  });
  await app.close();
}

void run();
