import { PdfExtractionError } from './pdf-observation-extractor.port';
import { PdfObservationExtractorAdapter } from './pdf-observation-extractor.adapter';

const getTextMock = jest.fn();
const destroyMock = jest.fn();

jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: getTextMock,
    destroy: destroyMock,
  })),
}));

describe('PdfObservationExtractorAdapter', () => {
  const adapter = new PdfObservationExtractorAdapter();

  beforeEach(() => {
    getTextMock.mockReset();
    destroyMock.mockReset();
    destroyMock.mockResolvedValue(undefined);
  });

  it('maps extracted lines into observations', async () => {
    getTextMock.mockResolvedValue({
      total: 2,
      text: 'Roof issue\n\nPlumbing concern',
    });

    const result = await adapter.extract(Buffer.from('%PDF-1.4\nfake'));

    expect(result).toEqual({
      pageCount: 2,
      observations: [
        { section: 'general', text: 'Roof issue' },
        { section: 'general', text: 'Plumbing concern' },
      ],
    });
    expect(destroyMock).toHaveBeenCalledTimes(1);
  });

  it('throws typed extraction error when parser fails', async () => {
    getTextMock.mockRejectedValue(new Error('boom'));

    await expect(adapter.extract(Buffer.from('%PDF-1.4\nbad'))).rejects.toThrow(
      PdfExtractionError,
    );
    expect(destroyMock).toHaveBeenCalledTimes(1);
  });
});
