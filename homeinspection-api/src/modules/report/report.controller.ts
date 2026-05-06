import {
  BadRequestException,
  Controller,
  HttpException,
  InternalServerErrorException,
  UploadedFile,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { PdfExtractionError } from './extractors/pdf-observation-extractor.port';
import { ReportService } from './report.service';

type UploadedFileLike = {
  mimetype: string;
  buffer: Buffer;
};

function isUploadedFileLike(value: unknown): value is UploadedFileLike {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<UploadedFileLike>;
  return (
    typeof candidate.mimetype === 'string' && Buffer.isBuffer(candidate.buffer)
  );
}

@Controller('v1/report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @UseGuards(ApiKeyGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  @Post('upload')
  async uploadShell(@UploadedFile() file?: unknown): Promise<never> {
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

    try {
      await this.reportService.extractPreview(file.buffer);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (!(error instanceof PdfExtractionError)) {
        throw new InternalServerErrorException();
      }
      throw new BadRequestException({
        message: 'PDF parsing failed. Please upload a different PDF file.',
        details: { code: 'UPLOAD_PDF_PARSE_FAILED' },
      });
    }

    throw new BadRequestException({
      message:
        'Upload shell endpoint is active. File processing is not implemented yet.',
      details: { code: 'UPLOAD_SHELL_ONLY' },
    });
  }
}
