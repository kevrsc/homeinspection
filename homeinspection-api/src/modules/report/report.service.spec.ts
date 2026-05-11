import {
  PdfExtractionError,
  PdfObservationExtractor,
} from './extractors/pdf-observation-extractor.port';
import { ReportService, UploadProcessingTimeoutError } from './report.service';
import type { AiSummarizer } from './summarization/ai-summarizer.port';

describe('ReportService', () => {
  let previousTimeout: string | undefined;

  const summarizerStub: AiSummarizer = {
    summarize: jest.fn().mockResolvedValue({
      executiveSummary: 'stub',
      prioritizedItems: [],
    }),
  };

  beforeEach(() => {
    previousTimeout = process.env.UPLOAD_PROCESSING_TIMEOUT_MS;
  });

  afterEach(() => {
    if (previousTimeout === undefined) {
      delete process.env.UPLOAD_PROCESSING_TIMEOUT_MS;
      return;
    }
    process.env.UPLOAD_PROCESSING_TIMEOUT_MS = previousTimeout;
  });

  it('maps extracted observations into section-linked response shape', async () => {
    const extractMock = jest.fn().mockResolvedValue({
      pageCount: 2,
      observations: [
        { section: 'roof', text: 'Missing shingles' },
        { section: 'plumbing', text: 'Pipe leak under sink' },
        { section: 'roof', text: 'Flashing issue' },
      ],
    });
    const extractor: PdfObservationExtractor = {
      extract: extractMock,
    };
    const service = new ReportService(extractor, summarizerStub);
    const pdfBuffer = Buffer.from('%PDF-1.4\nfake');

    const result = await service.extractPreview(pdfBuffer);

    expect(extractMock).toHaveBeenCalledTimes(1);
    const [calledBuffer, calledOptions] = extractMock.mock.calls[0] as [
      Buffer,
      { signal?: AbortSignal },
    ];
    expect(calledBuffer).toEqual(pdfBuffer);
    expect(calledOptions.signal).toBeInstanceOf(AbortSignal);
    expect(result).toEqual({
      pageCount: 2,
      sections: [
        {
          sectionName: 'roof',
          observations: [
            { text: 'Missing shingles' },
            { text: 'Flashing issue' },
          ],
        },
        {
          sectionName: 'plumbing',
          observations: [{ text: 'Pipe leak under sink' }],
        },
      ],
    });
  });

  it('uses general section fallback when extractor section is empty', async () => {
    const extractMock = jest.fn().mockResolvedValue({
      pageCount: 1,
      observations: [{ section: '', text: 'Unscoped observation' }],
    });
    const extractor: PdfObservationExtractor = {
      extract: extractMock,
    };
    const service = new ReportService(extractor, summarizerStub);

    const result = await service.extractPreview(Buffer.from('%PDF-1.4\nfake'));

    expect(result).toEqual({
      pageCount: 1,
      sections: [
        {
          sectionName: 'general',
          observations: [{ text: 'Unscoped observation' }],
        },
      ],
    });
  });

  it('uses general section fallback when extractor section is whitespace', async () => {
    const extractMock = jest.fn().mockResolvedValue({
      pageCount: 1,
      observations: [
        { section: '   ', text: 'Whitespace section observation' },
      ],
    });
    const extractor: PdfObservationExtractor = {
      extract: extractMock,
    };
    const service = new ReportService(extractor, summarizerStub);

    const result = await service.extractPreview(Buffer.from('%PDF-1.4\nfake'));

    expect(result).toEqual({
      pageCount: 1,
      sections: [
        {
          sectionName: 'general',
          observations: [{ text: 'Whitespace section observation' }],
        },
      ],
    });
  });

  it('returns empty sections array when no observations are extracted', async () => {
    const extractMock = jest.fn().mockResolvedValue({
      pageCount: 3,
      observations: [],
    });
    const extractor: PdfObservationExtractor = {
      extract: extractMock,
    };
    const service = new ReportService(extractor, summarizerStub);

    const result = await service.extractPreview(Buffer.from('%PDF-1.4\nfake'));

    expect(result).toEqual({
      pageCount: 3,
      sections: [],
    });
  });

  it('preserves first-seen section order in grouped response', async () => {
    const extractMock = jest.fn().mockResolvedValue({
      pageCount: 1,
      observations: [
        { section: 'plumbing', text: 'First plumbing note' },
        { section: 'roof', text: 'Roof note' },
        { section: 'plumbing', text: 'Second plumbing note' },
      ],
    });
    const extractor: PdfObservationExtractor = {
      extract: extractMock,
    };
    const service = new ReportService(extractor, summarizerStub);

    const result = await service.extractPreview(Buffer.from('%PDF-1.4\nfake'));

    expect(result.sections.map((section) => section.sectionName)).toEqual([
      'plumbing',
      'roof',
    ]);
  });

  it('throws PdfExtractionError when extractor payload shape is invalid', async () => {
    const extractMock = jest.fn().mockResolvedValue({
      pageCount: 1,
      observations: null,
    });
    const extractor = {
      extract: extractMock,
    } as unknown as PdfObservationExtractor;
    const service = new ReportService(extractor, summarizerStub);

    await expect(
      service.extractPreview(Buffer.from('%PDF-1.4\nfake')),
    ).rejects.toBeInstanceOf(PdfExtractionError);
  });

  it('throws UploadProcessingTimeoutError when extraction exceeds configured timeout', async () => {
    process.env.UPLOAD_PROCESSING_TIMEOUT_MS = '1';
    const extractMock = jest.fn(
      () =>
        new Promise<never>(() => {
          // Intentionally unresolved to trigger timeout path.
        }),
    );
    const extractor = {
      extract: extractMock,
    } as unknown as PdfObservationExtractor;
    const service = new ReportService(extractor, summarizerStub);

    await expect(
      service.extractPreview(Buffer.from('%PDF-1.4\nslow')),
    ).rejects.toBeInstanceOf(UploadProcessingTimeoutError);
  });

  it('delegates summarizeObservations to the AI summarizer port', async () => {
    const extractMock = jest.fn();
    const summarizeMock = jest.fn().mockResolvedValue({
      executiveSummary: 'Summary',
      prioritizedItems: [
        { rank: 1, title: 'Fix roof', rationale: 'Noted in input.' },
      ],
    });
    const summarizer: AiSummarizer = { summarize: summarizeMock };
    const extractor = {
      extract: extractMock,
    } as unknown as PdfObservationExtractor;
    const service = new ReportService(extractor, summarizer);
    const input = {
      pageCount: 1,
      sections: [
        { sectionName: 'roof', observations: [{ text: 'Missing tab' }] },
      ],
    };
    const ac = new AbortController();

    await expect(
      service.summarizeObservations(input, { signal: ac.signal }),
    ).resolves.toEqual({
      executiveSummary: 'Summary',
      prioritizedItems: [
        { rank: 1, title: 'Fix roof', rationale: 'Noted in input.' },
      ],
    });
    expect(summarizeMock).toHaveBeenCalledWith(input, { signal: ac.signal });
    expect(extractMock).not.toHaveBeenCalled();
  });
});
