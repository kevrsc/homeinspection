import { BadRequestException } from '@nestjs/common';
import {
  SUMMARIZE_MAX_OBSERVATION_TEXT_LENGTH,
  SUMMARIZE_MAX_OBSERVATIONS_PER_SECTION,
  SUMMARIZE_MAX_SECTIONS,
  parseAndValidateSummarizeBody,
} from './summarize-request.validation';

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

  it('rejects when sections exceed configured max', () => {
    const sections = Array.from(
      { length: SUMMARIZE_MAX_SECTIONS + 1 },
      (_, i) => ({
        sectionName: `s${i}`,
        observations: [{ text: 'x' }],
      }),
    );
    try {
      parseAndValidateSummarizeBody({ pageCount: 1, sections });
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(BadRequestException);
      const res = (e as BadRequestException).getResponse() as {
        details: { code: string; field: string };
      };
      expect(res.details.code).toBe('SUMMARIZATION_BODY_LIMIT_EXCEEDED');
      expect(res.details.field).toBe('sections');
      return;
    }
    throw new Error('expected BadRequestException');
  });

  it('rejects when a section has too many observations', () => {
    const observations = Array.from(
      { length: SUMMARIZE_MAX_OBSERVATIONS_PER_SECTION + 1 },
      () => ({ text: 'x' }),
    );
    try {
      parseAndValidateSummarizeBody({
        pageCount: 0,
        sections: [{ sectionName: 'one', observations }],
      });
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(BadRequestException);
      const res = (e as BadRequestException).getResponse() as {
        details: { code: string; field: string };
      };
      expect(res.details.code).toBe('SUMMARIZATION_BODY_LIMIT_EXCEEDED');
      expect(res.details.field).toBe('observations');
      return;
    }
    throw new Error('expected BadRequestException');
  });

  it('rejects when observation text exceeds max length after trim', () => {
    const text = 'w'.repeat(SUMMARIZE_MAX_OBSERVATION_TEXT_LENGTH + 1);
    expect(() =>
      parseAndValidateSummarizeBody({
        pageCount: 1,
        sections: [{ sectionName: 'roof', observations: [{ text }] }],
      }),
    ).toThrow(BadRequestException);
  });
});
