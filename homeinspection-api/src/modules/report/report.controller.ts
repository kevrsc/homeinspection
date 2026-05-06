import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpException,
  InternalServerErrorException,
  RequestTimeoutException,
  UnprocessableEntityException,
  UploadedFile,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ReportUploadResponseDto } from './dto/extraction-response.dto';
import { PdfExtractionError } from './extractors/pdf-observation-extractor.port';
import { ReportService, UploadProcessingTimeoutError } from './report.service';
import {
  uploadErrorSchema,
  uploadOpenApiExamples,
} from '../../openapi/upload.openapi';

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

@ApiTags('report')
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
  @ApiOperation({
    summary: 'Upload inspection PDF and return section-linked observations.',
  })
  @ApiSecurity('mockAuth')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Inspection report PDF file (max 20 MB).',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Successful extraction response.',
    schema: {
      type: 'object',
      properties: {
        pageCount: { type: 'number' },
        sections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sectionName: { type: 'string' },
              observations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string' },
                  },
                  required: ['text'],
                },
              },
            },
            required: ['sectionName', 'observations'],
          },
        },
      },
      required: ['pageCount', 'sections'],
    },
    example: uploadOpenApiExamples.success.value,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failure.',
    schema: uploadErrorSchema,
    example: uploadOpenApiExamples.validationFailed.value,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    schema: uploadErrorSchema,
    example: uploadOpenApiExamples.unauthorized.value,
  })
  @ApiResponse({
    status: 413,
    description: 'Upload payload exceeds the configured file size limit.',
    schema: uploadErrorSchema,
    example: uploadOpenApiExamples.payloadTooLarge.value,
  })
  @ApiResponse({
    status: 408,
    description: 'Extraction timeout.',
    schema: uploadErrorSchema,
    example: uploadOpenApiExamples.extractionTimeout.value,
  })
  @ApiResponse({
    status: 422,
    description: 'Extraction failure.',
    schema: uploadErrorSchema,
    example: uploadOpenApiExamples.extractionFailed.value,
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limited.',
    schema: uploadErrorSchema,
    example: uploadOpenApiExamples.rateLimited.value,
  })
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
      if (error instanceof UploadProcessingTimeoutError) {
        throw new RequestTimeoutException({
          message:
            'Upload processing timed out. Please retry with a smaller file or try again later.',
          details: {
            code: 'UPLOAD_PROCESSING_TIMEOUT',
            retryable: true,
            timeoutMs: error.timeoutMs,
          },
        });
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
