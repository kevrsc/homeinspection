import { describe, expect, it } from 'vitest';
import {
  formatSectionHeading,
  parseUploadSuccess,
} from './uploadSuccessModel';

const SUCCESS_FIXTURE = {
  pageCount: 1,
  sections: [
    {
      sectionName: 'roof',
      observations: [{ text: 'Damaged shingle near ridge' }],
    },
    {
      sectionName: 'plumbing',
      observations: [{ text: 'Slow leak at shutoff valve' }],
    },
  ],
};

describe('parseUploadSuccess', () => {
  it('accepts canonical upload-success fixture shape', () => {
    const r = parseUploadSuccess(SUCCESS_FIXTURE);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    expect(r.data.pageCount).toBe(1);
    expect(r.data.sections).toHaveLength(2);
    expect(r.data.sections[0]?.observations[0]?.text).toBe(
      'Damaged shingle near ridge',
    );
  });

  it('accepts payload without pageCount', () => {
    const r = parseUploadSuccess({
      sections: [{ sectionName: 'a', observations: [{ text: 'x' }] }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    expect(r.data.pageCount).toBeUndefined();
  });

  it('rejects non-object root', () => {
    expect(parseUploadSuccess(null).ok).toBe(false);
    expect(parseUploadSuccess('[]').ok).toBe(false);
  });

  it('rejects invalid observation row', () => {
    expect(
      parseUploadSuccess({
        sections: [{ sectionName: 'x', observations: [{ text: 1 }] }],
      } as unknown).ok,
    ).toBe(false);
  });

  it('rejects missing sections array', () => {
    expect(parseUploadSuccess({ pageCount: 1 }).ok).toBe(false);
  });
});

describe('formatSectionHeading', () => {
  it('title-cases slug segments', () => {
    expect(formatSectionHeading('hvac-unit')).toBe('Hvac Unit');
    expect(formatSectionHeading('roof')).toBe('Roof');
  });

  it('handles empty input', () => {
    expect(formatSectionHeading('   ')).toBe('Untitled section');
  });
});
