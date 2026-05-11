import { BadRequestException } from '@nestjs/common';

export type UploadedPdfFile = {
  mimetype: string;
  buffer: Buffer;
};

function isUploadedFileLike(value: unknown): value is UploadedPdfFile {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<UploadedPdfFile>;
  return (
    typeof candidate.mimetype === 'string' && Buffer.isBuffer(candidate.buffer)
  );
}

/**
 * Same PDF checks as `POST /v1/report/upload`: multipart `file` present,
 * `application/pdf`, `%PDF-` magic bytes.
 */
export function assertValidUploadedPdfFile(file: unknown): UploadedPdfFile {
  if (!isUploadedFileLike(file)) {
    throw new BadRequestException({
      message: 'PDF file is required.',
      details: { code: 'UPLOAD_FILE_REQUIRED' },
    });
  }

  const looksLikePdf =
    file.buffer.length >= 5 &&
    file.buffer.subarray(0, 5).toString('ascii') === '%PDF-';

  if (file.mimetype !== 'application/pdf' || !looksLikePdf) {
    throw new BadRequestException({
      message: 'Only PDF uploads are supported.',
      details: { code: 'UPLOAD_PDF_REQUIRED' },
    });
  }

  return file;
}
