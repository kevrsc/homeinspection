import { InternalServerErrorException } from '@nestjs/common';
import { PdfExtractionError } from './extractors/pdf-observation-extractor.port';
import { ReportController } from './report.controller';
import { ReportService, UploadProcessingTimeoutError } from './report.service';
import { SummarizationProviderError } from './summarization/ai-summarizer.port';

describe('ReportController', () => {
  const validFile = {
    mimetype: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\nmock'),
  };

  it('returns section-linked extraction payload on successful parse', async () => {
    const reportService = {
      extractPreview: jest.fn().mockResolvedValue({
        pageCount: 1,
        sections: [
          {
            sectionName: 'roof',
            observations: [{ text: 'Leak near vent' }],
          },
        ],
      }),
    } as unknown as ReportService;
    const controller = new ReportController(reportService);

    await expect(controller.uploadShell(validFile)).resolves.toEqual({
      pageCount: 1,
      sections: [
        {
          sectionName: 'roof',
          observations: [{ text: 'Leak near vent' }],
        },
      ],
    });
  });

  it('returns parse-failed validation response when extraction fails', async () => {
    const reportService = {
      extractPreview: jest
        .fn()
        .mockRejectedValue(new PdfExtractionError('bad')),
    } as unknown as ReportService;
    const controller = new ReportController(reportService);

    await expect(controller.uploadShell(validFile)).rejects.toMatchObject({
      status: 422,
      response: {
        message: 'PDF parsing failed. Please upload a different PDF file.',
        details: { code: 'UPLOAD_PDF_PARSE_FAILED', retryable: false },
      },
    });
  });

  it('includes safe partial context on extraction failures when available', async () => {
    const reportService = {
      extractPreview: jest
        .fn()
        .mockRejectedValue(
          new PdfExtractionError('bad', { cause: { pageCount: 3 } }),
        ),
    } as unknown as ReportService;
    const controller = new ReportController(reportService);

    await expect(controller.uploadShell(validFile)).rejects.toMatchObject({
      response: {
        details: {
          code: 'UPLOAD_PDF_PARSE_FAILED',
          retryable: false,
          partial: { pageCount: 3 },
        },
      },
    });
  });

  it('returns timeout classification when extraction exceeds processing budget', async () => {
    const reportService = {
      extractPreview: jest
        .fn()
        .mockRejectedValue(new UploadProcessingTimeoutError(25)),
    } as unknown as ReportService;
    const controller = new ReportController(reportService);

    await expect(controller.uploadShell(validFile)).rejects.toMatchObject({
      status: 408,
      response: {
        message:
          'Upload processing timed out. Please retry with a smaller file or try again later.',
        details: {
          code: 'UPLOAD_PROCESSING_TIMEOUT',
          retryable: true,
          timeoutMs: 25,
        },
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

  const validSummarizeBody = {
    pageCount: 1,
    sections: [
      { sectionName: 'roof', observations: [{ text: 'Leak at vent' }] },
    ],
  };

  it('returns structured summary on successful summarization', async () => {
    const summary = {
      executiveSummary: 'Roof needs repair.',
      prioritizedItems: [
        { rank: 1, title: 'Vent leak', rationale: 'Called out in input.' },
      ],
    };
    const reportService = {
      extractPreview: jest.fn(),
      summarizeObservations: jest.fn().mockResolvedValue(summary),
    } as unknown as ReportService;
    const controller = new ReportController(reportService);

    await expect(
      controller.summarizeShell(validSummarizeBody),
    ).resolves.toEqual(summary);
  });

  it('rejects summarize body with empty sectionName', async () => {
    const summarizeObservations = jest.fn();
    const reportService = {
      extractPreview: jest.fn(),
      summarizeObservations,
    } as unknown as ReportService;
    const controller = new ReportController(reportService);

    await expect(
      controller.summarizeShell({
        pageCount: 1,
        sections: [{ sectionName: '   ', observations: [{ text: 'Obs' }] }],
      }),
    ).rejects.toMatchObject({
      status: 400,
      response: {
        message: 'sectionName must not be empty or whitespace-only.',
        details: { code: 'SUMMARIZATION_BODY_INVALID' },
      },
    });
    expect(summarizeObservations).not.toHaveBeenCalled();
  });

  it('maps SummarizationProviderError INVALID_RESPONSE to 422', async () => {
    const reportService = {
      extractPreview: jest.fn(),
      summarizeObservations: jest
        .fn()
        .mockRejectedValue(
          new SummarizationProviderError(
            'INVALID_RESPONSE',
            'bad model output',
          ),
        ),
    } as unknown as ReportService;
    const controller = new ReportController(reportService);

    await expect(
      controller.summarizeShell(validSummarizeBody),
    ).rejects.toMatchObject({
      status: 422,
      response: {
        message: 'Summarization could not produce a valid structured response.',
        details: { code: 'SUMMARIZATION_INVALID_RESPONSE' },
      },
    });
  });

  it('maps SummarizationProviderError TIMEOUT to 408', async () => {
    const reportService = {
      extractPreview: jest.fn(),
      summarizeObservations: jest
        .fn()
        .mockRejectedValue(
          new SummarizationProviderError('TIMEOUT', 'timed out'),
        ),
    } as unknown as ReportService;
    const controller = new ReportController(reportService);

    await expect(
      controller.summarizeShell(validSummarizeBody),
    ).rejects.toMatchObject({
      status: 408,
      response: {
        details: {
          code: 'SUMMARIZATION_TIMEOUT',
          retryable: true,
        },
      },
    });
  });

  it('maps SummarizationProviderError UNREACHABLE to 502', async () => {
    const reportService = {
      extractPreview: jest.fn(),
      summarizeObservations: jest
        .fn()
        .mockRejectedValue(
          new SummarizationProviderError('UNREACHABLE', 'econnrefused'),
        ),
    } as unknown as ReportService;
    const controller = new ReportController(reportService);

    await expect(
      controller.summarizeShell(validSummarizeBody),
    ).rejects.toMatchObject({
      status: 502,
      response: {
        details: {
          code: 'SUMMARIZATION_UPSTREAM_ERROR',
          providerCode: 'UNREACHABLE',
        },
      },
    });
  });

  it('maps SummarizationProviderError HTTP_ERROR to 502', async () => {
    const reportService = {
      extractPreview: jest.fn(),
      summarizeObservations: jest
        .fn()
        .mockRejectedValue(
          new SummarizationProviderError('HTTP_ERROR', 'upstream 503'),
        ),
    } as unknown as ReportService;
    const controller = new ReportController(reportService);

    await expect(
      controller.summarizeShell(validSummarizeBody),
    ).rejects.toMatchObject({
      status: 502,
      response: {
        details: {
          code: 'SUMMARIZATION_UPSTREAM_ERROR',
          providerCode: 'HTTP_ERROR',
        },
      },
    });
  });
});
