import {
  BadGatewayException,
  Body,
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
import { parseAndValidateSummarizeBody } from './dto/summarize-request.validation';
import { ReportUploadResponseDto } from './dto/extraction-response.dto';
import { PdfExtractionError } from './extractors/pdf-observation-extractor.port';
import { ReportService, UploadProcessingTimeoutError } from './report.service';
import { SummarizationProviderError } from './summarization/ai-summarizer.port';
import type { ObservationSummaryResult } from './summarization/observation-summary.types';
import {
  observationSummaryOpenApiExample,
  summarizeOpenApiExamples,
  summarizeRequestBodyOpenApiSchema,
} from '../../openapi/summarization.openapi';
import {
  uploadErrorSchema,
  uploadOpenApiExamples,
} from '../../openapi/upload.openapi';
import { assertValidUploadedPdfFile } from './uploaded-pdf-file.validation';

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

function mapSummarizationProviderError(
  error: SummarizationProviderError,
): never {
  switch (error.code) {
    case 'INVALID_RESPONSE':
      throw new UnprocessableEntityException({
        message: 'Summarization could not produce a valid structured response.',
        details: { code: 'SUMMARIZATION_INVALID_RESPONSE' },
      });
    case 'TIMEOUT':
      throw new RequestTimeoutException({
        message: 'Summarization timed out. Please retry later.',
        details: { code: 'SUMMARIZATION_TIMEOUT', retryable: true },
      });
    case 'HTTP_ERROR':
    case 'UNREACHABLE':
      throw new BadGatewayException({
        message: 'Summarization service is temporarily unavailable.',
        details: {
          code: 'SUMMARIZATION_UPSTREAM_ERROR',
          providerCode: error.code,
        },
      });
    default: {
      const providerCode =
        typeof error.code === 'string' ? error.code : 'UNKNOWN';
      throw new BadGatewayException({
        message: 'Summarization service is temporarily unavailable.',
        details: {
          code: 'SUMMARIZATION_UPSTREAM_ERROR',
          providerCode,
        },
      });
    }
  }
}

@ApiTags('report')
@Controller('v1/report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  private throwMappedExtractionPipelineError(error: unknown): never {
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

  private throwMappedPdfSingleShotError(error: unknown): never {
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
    if (error instanceof PdfExtractionError) {
      throw new UnprocessableEntityException({
        message: 'PDF parsing failed. Please upload a different PDF file.',
        details: getExtractionErrorDetails(error),
      });
    }
    if (error instanceof SummarizationProviderError) {
      mapSummarizationProviderError(error);
    }
    throw new InternalServerErrorException();
  }

  private throwMappedSummarizationOnlyError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }
    if (error instanceof SummarizationProviderError) {
      mapSummarizationProviderError(error);
    }
    throw new InternalServerErrorException();
  }

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
    const valid = assertValidUploadedPdfFile(file);
    try {
      return await this.reportService.extractPreview(valid.buffer);
    } catch (error: unknown) {
      this.throwMappedExtractionPipelineError(error);
    }
  }

  @UseGuards(ApiKeyGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  @Post('summarize/file')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'reportSummarizeFromPdfFile',
    summary:
      'Upload a PDF and return a structured AI summary in one request (extract then summarize).',
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
    description: 'Structured AI summary after successful PDF extraction.',
    schema: { $ref: '#/components/schemas/ObservationSummary' },
    example: observationSummaryOpenApiExample,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failure (missing file or non-PDF).',
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
    description: 'Extraction timeout or summarization timeout.',
    schema: uploadErrorSchema,
    example: uploadOpenApiExamples.extractionTimeout.value,
  })
  @ApiResponse({
    status: 422,
    description: 'Extraction failure or summarization invalid output.',
    schema: uploadErrorSchema,
    example: uploadOpenApiExamples.extractionFailed.value,
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limited.',
    schema: uploadErrorSchema,
    example: uploadOpenApiExamples.rateLimited.value,
  })
  @ApiResponse({
    status: 502,
    description: 'Summarization upstream unavailable.',
    schema: uploadErrorSchema,
    example: summarizeOpenApiExamples.summarizationUnavailable.value,
  })
  async summarizeFromPdfFileShell(
    @UploadedFile() file?: unknown,
  ): Promise<ObservationSummaryResult> {
    const valid = assertValidUploadedPdfFile(file);
    try {
      return await this.reportService.summarizeFromPdfBuffer(valid.buffer);
    } catch (error: unknown) {
      this.throwMappedPdfSingleShotError(error);
    }
  }

  @UseGuards(ApiKeyGuard)
  @Post('summarize')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Summarize prior extraction output (JSON body same shape as upload success).',
  })
  @ApiSecurity('mockAuth')
  @ApiBody({
    description:
      'Section-linked observations (`pageCount` + `sections[]`) matching upload success.',
    schema: summarizeRequestBodyOpenApiSchema,
    examples: {
      observations: summarizeOpenApiExamples.requestBody,
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Structured AI summary of the supplied observations.',
    schema: { $ref: '#/components/schemas/ObservationSummary' },
    example: observationSummaryOpenApiExample,
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failure (body shape, empty fields, or summarize payload caps — `details.code` is `SUMMARIZATION_BODY_INVALID` or `SUMMARIZATION_BODY_LIMIT_EXCEEDED`).',
    schema: uploadErrorSchema,
    example: summarizeOpenApiExamples.bodyInvalid.value,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
    schema: uploadErrorSchema,
    example: uploadOpenApiExamples.unauthorized.value,
  })
  @ApiResponse({
    status: 408,
    description: 'Summarization timeout.',
    schema: uploadErrorSchema,
    example: summarizeOpenApiExamples.summarizationTimeout.value,
  })
  @ApiResponse({
    status: 422,
    description: 'Summarization could not produce valid structured output.',
    schema: uploadErrorSchema,
    example: summarizeOpenApiExamples.summarizationInvalid.value,
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limited.',
    schema: uploadErrorSchema,
    example: uploadOpenApiExamples.rateLimited.value,
  })
  @ApiResponse({
    status: 502,
    description: 'Summarization upstream unavailable.',
    schema: uploadErrorSchema,
    example: summarizeOpenApiExamples.summarizationUnavailable.value,
  })
  async summarizeShell(
    @Body() body: unknown,
  ): Promise<ObservationSummaryResult> {
    const dto = parseAndValidateSummarizeBody(body);
    try {
      return await this.reportService.summarizeObservations(dto);
    } catch (error: unknown) {
      this.throwMappedSummarizationOnlyError(error);
    }
  }
}
