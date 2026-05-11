import { describe, expect, it } from 'vitest';
import { MAX_UPLOAD_BYTES } from './uploadLimits';
import {
  validatePdfFile,
  validatePdfUploadCandidate,
} from './validatePdfFile';

describe('validatePdfUploadCandidate', () => {
  it('accepts application/pdf with .pdf name at max bytes', () => {
    expect(
      validatePdfUploadCandidate({
        size: MAX_UPLOAD_BYTES,
        name: 'report.pdf',
        type: 'application/pdf',
      }),
    ).toEqual({ ok: true });
  });

  it('rejects when size exceeds max', () => {
    expect(
      validatePdfUploadCandidate({
        size: MAX_UPLOAD_BYTES + 1,
        name: 'report.pdf',
        type: 'application/pdf',
      }),
    ).toEqual({ ok: false, reason: 'size' });
  });

  it('accepts empty MIME when extension is .pdf', () => {
    expect(
      validatePdfUploadCandidate({
        size: 100,
        name: 'report.pdf',
        type: '',
      }),
    ).toEqual({ ok: true });
  });

  it('accepts application/octet-stream when extension is .pdf', () => {
    expect(
      validatePdfUploadCandidate({
        size: 100,
        name: 'report.pdf',
        type: 'application/octet-stream',
      }),
    ).toEqual({ ok: true });
  });

  it('rejects mismatched MIME (image/png) even if name ends with .pdf', () => {
    expect(
      validatePdfUploadCandidate({
        size: 100,
        name: 'fake.pdf',
        type: 'image/png',
      }),
    ).toEqual({ ok: false, reason: 'type' });
  });

  it('accepts application/pdf regardless of file name extension', () => {
    expect(
      validatePdfUploadCandidate({
        size: 100,
        name: 'download',
        type: 'application/pdf',
      }),
    ).toEqual({ ok: true });
  });

  it('rejects non-pdf name when MIME empty', () => {
    expect(
      validatePdfUploadCandidate({
        size: 10,
        name: 'notes.doc',
        type: '',
      }),
    ).toEqual({ ok: false, reason: 'type' });
  });
});

describe('validatePdfFile', () => {
  it('delegates to candidate validation', () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'ok.pdf', {
      type: 'application/pdf',
    });
    expect(validatePdfFile(file)).toEqual({ ok: true });
  });
});
