import { BadRequestException } from '@nestjs/common';
import { parseAndValidateSummarizeBody } from './summarize-request.validation';

describe('parseAndValidateSummarizeBody', () => {
  it('accepts a valid upload-shaped payload', () => {
    const body = {
      pageCount: 2,
      sections: [
        {
          sectionName: 'roof',
          observations: [{ text: '  Shingle gap  ' }],
        },
      ],
    };
    expect(parseAndValidateSummarizeBody(body)).toEqual({
      pageCount: 2,
      sections: [
        {
          sectionName: 'roof',
          observations: [{ text: 'Shingle gap' }],
        },
      ],
    });
  });

  it('rejects non-object body', () => {
    expect(() => parseAndValidateSummarizeBody(null)).toThrow(
      BadRequestException,
    );
  });

  it('rejects invalid pageCount', () => {
    expect(() =>
      parseAndValidateSummarizeBody({
        pageCount: 1.5,
        sections: [],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects empty observation text', () => {
    expect(() =>
      parseAndValidateSummarizeBody({
        pageCount: 0,
        sections: [{ sectionName: 'x', observations: [{ text: '   ' }] }],
      }),
    ).toThrow(BadRequestException);
  });
});
