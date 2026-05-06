import { InternalServerErrorException } from '@nestjs/common';
import { PdfExtractionError } from './extractors/pdf-observation-extractor.port';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

describe('ReportController', () => {
  const validFile = {
    mimetype: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\nmock'),
  };

  it('returns parse-failed validation response when extraction fails', async () => {
    const reportService = {
      extractPreview: jest
        .fn()
        .mockRejectedValue(new PdfExtractionError('bad')),
    } as unknown as ReportService;
    const controller = new ReportController(reportService);

    await expect(controller.uploadShell(validFile)).rejects.toMatchObject({
      response: {
        message: 'PDF parsing failed. Please upload a different PDF file.',
        details: { code: 'UPLOAD_PDF_PARSE_FAILED' },
      },
    });
  });

  it('returns internal error for unexpected extraction failures', async () => {
    const reportService = {
      extractPreview: jest.fn().mockRejectedValue(new Error('unexpected')),
    } as unknown as ReportService;
    const controller = new ReportController(reportService);

    await expect(controller.uploadShell(validFile)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
