import { MAX_UPLOAD_BYTES, PDF_MIME_TYPE } from './uploadLimits';

export type ValidatePdfFileResult =
  | { ok: true }
  | { ok: false; reason: 'type' | 'size' };

function pdfExtensionOk(fileName: string): boolean {
  return /\.pdf$/i.test(fileName);
}

/**
 * Pure validation used by {@link validatePdfFile} — handy for tight boundary tests without huge `File` payloads.
 */
export function validatePdfUploadCandidate(input: {
  size: number;
  name: string;
  type: string;
}): ValidatePdfFileResult {
  if (input.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: 'size' };
  }

  const extOk = pdfExtensionOk(input.name);
  const mime = input.type.trim().toLowerCase();

  if (mime === PDF_MIME_TYPE) {
    return { ok: true };
  }

  if (mime === '' || mime === 'application/octet-stream') {
    if (!extOk) return { ok: false, reason: 'type' };
    return { ok: true };
  }

  return { ok: false, reason: 'type' };
}

export function validatePdfFile(file: File): ValidatePdfFileResult {
  return validatePdfUploadCandidate({
    size: file.size,
    name: file.name,
    type: file.type,
  });
}
