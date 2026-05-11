import { BadRequestException } from '@nestjs/common';
import type { ReportUploadResponseDto } from './extraction-response.dto';

/**
 * Hard caps for JSON summarize bodies (`POST /v1/report/summarize`) and extracted
 * payloads before single-shot summarize (`POST /v1/report/summarize/file`).
 * Must stay aligned with OpenAPI (`summarizeRequestBodyOpenApiSchema`).
 */
export const SUMMARIZE_MAX_PAGE_COUNT = 50_000;
export const SUMMARIZE_MAX_SECTIONS = 80;
export const SUMMARIZE_MAX_OBSERVATIONS_PER_SECTION = 2000;
export const SUMMARIZE_MAX_SECTION_NAME_LENGTH = 256;
export const SUMMARIZE_MAX_OBSERVATION_TEXT_LENGTH = 8192;

function throwSummarizeLimitExceeded(
  message: string,
  details: Record<string, unknown>,
): never {
  throw new BadRequestException({
    message,
    details: {
      code: 'SUMMARIZATION_BODY_LIMIT_EXCEEDED',
      ...details,
    },
  });
}

/**
 * Enforces Story 5.7 payload caps on an upload-shaped DTO (after structural validation).
 * Used by JSON summarize and by the single-shot PDF → summarize path.
 */
export function enforceSummarizePayloadLimits(
  dto: ReportUploadResponseDto,
): void {
  if (dto.pageCount > SUMMARIZE_MAX_PAGE_COUNT) {
    throwSummarizeLimitExceeded(
      `pageCount must be at most ${SUMMARIZE_MAX_PAGE_COUNT}.`,
      { field: 'pageCount', max: SUMMARIZE_MAX_PAGE_COUNT },
    );
  }
  if (dto.sections.length > SUMMARIZE_MAX_SECTIONS) {
    throwSummarizeLimitExceeded(
      `sections must contain at most ${SUMMARIZE_MAX_SECTIONS} entries.`,
      { field: 'sections', max: SUMMARIZE_MAX_SECTIONS },
    );
  }
  for (let si = 0; si < dto.sections.length; si += 1) {
    const sec = dto.sections[si];
    if (sec.sectionName.length > SUMMARIZE_MAX_SECTION_NAME_LENGTH) {
      throwSummarizeLimitExceeded(
        `sectionName at index ${si} exceeds ${SUMMARIZE_MAX_SECTION_NAME_LENGTH} characters after trim.`,
        {
          field: 'sectionName',
          sectionIndex: si,
          max: SUMMARIZE_MAX_SECTION_NAME_LENGTH,
        },
      );
    }
    if (sec.observations.length > SUMMARIZE_MAX_OBSERVATIONS_PER_SECTION) {
      throwSummarizeLimitExceeded(
        `observations at section index ${si} must contain at most ${SUMMARIZE_MAX_OBSERVATIONS_PER_SECTION} entries.`,
        {
          field: 'observations',
          sectionIndex: si,
          max: SUMMARIZE_MAX_OBSERVATIONS_PER_SECTION,
        },
      );
    }
    for (let oi = 0; oi < sec.observations.length; oi += 1) {
      const t = sec.observations[oi].text;
      if (t.length > SUMMARIZE_MAX_OBSERVATION_TEXT_LENGTH) {
        throwSummarizeLimitExceeded(
          `observation text at section ${si}, observation ${oi} exceeds ${SUMMARIZE_MAX_OBSERVATION_TEXT_LENGTH} characters after trim.`,
          {
            field: 'observations.text',
            sectionIndex: si,
            observationIndex: oi,
            max: SUMMARIZE_MAX_OBSERVATION_TEXT_LENGTH,
          },
        );
      }
    }
  }
}

/**
 * Validates JSON body for `POST /v1/report/summarize` (same shape as upload success).
 * Rejects empty trimmed `sectionName` (strict parity with upload-derived payloads).
 */
export function parseAndValidateSummarizeBody(
  body: unknown,
): ReportUploadResponseDto {
  if (typeof body !== 'object' || body === null) {
    throw new BadRequestException({
      message: 'Request body must be a JSON object.',
      details: { code: 'SUMMARIZATION_BODY_INVALID' },
    });
  }

  const root = body as Record<string, unknown>;
  const pageCount = root.pageCount;
  if (
    typeof pageCount !== 'number' ||
    !Number.isFinite(pageCount) ||
    !Number.isInteger(pageCount) ||
    pageCount < 0
  ) {
    throw new BadRequestException({
      message: 'pageCount must be a non-negative integer.',
      details: { code: 'SUMMARIZATION_BODY_INVALID' },
    });
  }

  const sections = root.sections;
  if (!Array.isArray(sections)) {
    throw new BadRequestException({
      message: 'sections must be an array.',
      details: { code: 'SUMMARIZATION_BODY_INVALID' },
    });
  }

  const outSections: ReportUploadResponseDto['sections'] = [];

  for (let s = 0; s < sections.length; s += 1) {
    const sec: unknown = sections[s];
    if (typeof sec !== 'object' || sec === null) {
      throw new BadRequestException({
        message: 'Each section must be an object.',
        details: { code: 'SUMMARIZATION_BODY_INVALID' },
      });
    }
    const so = sec as Record<string, unknown>;
    const sectionNameRaw = so.sectionName;
    if (typeof sectionNameRaw !== 'string') {
      throw new BadRequestException({
        message: 'sectionName must be a string.',
        details: { code: 'SUMMARIZATION_BODY_INVALID' },
      });
    }
    const sectionName = sectionNameRaw.trim();
    if (sectionName.length === 0) {
      throw new BadRequestException({
        message: 'sectionName must not be empty or whitespace-only.',
        details: { code: 'SUMMARIZATION_BODY_INVALID' },
      });
    }

    const observations = so.observations;
    if (!Array.isArray(observations)) {
      throw new BadRequestException({
        message: 'observations must be an array.',
        details: { code: 'SUMMARIZATION_BODY_INVALID' },
      });
    }

    const outObs: { text: string }[] = [];
    for (let o = 0; o < observations.length; o += 1) {
      const obs: unknown = observations[o];
      if (typeof obs !== 'object' || obs === null) {
        throw new BadRequestException({
          message: 'Each observation must be an object.',
          details: { code: 'SUMMARIZATION_BODY_INVALID' },
        });
      }
      const ot = obs as Record<string, unknown>;
      const textRaw = ot.text;
      if (typeof textRaw !== 'string' || textRaw.trim().length === 0) {
        throw new BadRequestException({
          message: 'Each observation text must be a non-empty string.',
          details: { code: 'SUMMARIZATION_BODY_INVALID' },
        });
      }
      outObs.push({ text: textRaw.trim() });
    }

    outSections.push({ sectionName, observations: outObs });
  }

  const dto: ReportUploadResponseDto = { pageCount, sections: outSections };
  enforceSummarizePayloadLimits(dto);
  return dto;
}
