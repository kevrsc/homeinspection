import { ReportService } from './report.service';
import { PdfObservationExtractor } from './extractors/pdf-observation-extractor.port';

describe('ReportService', () => {
  it('delegates extraction to the configured extractor port', async () => {
    const extractMock = jest.fn().mockResolvedValue({
      pageCount: 1,
      observations: [{ section: 'general', text: 'sample observation' }],
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
      pageCount: 1,
      observations: [{ section: 'general', text: 'sample observation' }],
    });
  });
});
