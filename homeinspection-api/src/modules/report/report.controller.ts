import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpException,
  InternalServerErrorException,
  UnprocessableEntityException,
  UploadedFile,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ReportUploadResponseDto } from './dto/extraction-response.dto';
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

function getExtractionErrorDetails(error: PdfExtractionError): {
  code: 'UPLOAD_PDF_PARSE_FAILED';
  retryable: false;
  partial?: { pageCount: number };
} {
  const details: {
    code: 'UPLOAD_PDF_PARSE_FAILED';
    retryable: false;
    partial?: { pageCount: number };
  } = {
    code: 'UPLOAD_PDF_PARSE_FAILED',
    retryable: false,
  };

  const cause = (error as Error & { cause?: unknown }).cause;
  if (typeof cause !== 'object' || cause === null) {
    return details;
  }

  const partial = cause as { pageCount?: unknown };
  if (
    typeof partial.pageCount === 'number' &&
    Number.isInteger(partial.pageCount) &&
    partial.pageCount > 0
  ) {
    details.partial = { pageCount: partial.pageCount };
  }

  return details;
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
  @HttpCode(200)
  async uploadShell(
    @UploadedFile() file?: unknown,
  ): Promise<ReportUploadResponseDto> {
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
      return await this.reportService.extractPreview(file.buffer);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (!(error instanceof PdfExtractionError)) {
        throw new InternalServerErrorException();
      }
      throw new UnprocessableEntityException({
        message: 'PDF parsing failed. Please upload a different PDF file.',
        details: getExtractionErrorDetails(error),
      });
    }
  }
}
