import { ReportService } from './report.service';
import {
  PdfExtractionError,
  PdfObservationExtractor,
} from './extractors/pdf-observation-extractor.port';

describe('ReportService', () => {
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
    const service = new ReportService(extractor);
    const pdfBuffer = Buffer.from('%PDF-1.4\nfake');

    const result = await service.extractPreview(pdfBuffer);

    expect(extractMock).toHaveBeenCalledTimes(1);
    expect(extractMock).toHaveBeenCalledWith(pdfBuffer);
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
    const service = new ReportService(extractor);

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
    const service = new ReportService(extractor);

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
    const service = new ReportService(extractor);

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
    const service = new ReportService(extractor);

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
    const service = new ReportService(extractor);

    await expect(
      service.extractPreview(Buffer.from('%PDF-1.4\nfake')),
    ).rejects.toBeInstanceOf(PdfExtractionError);
  });
});
