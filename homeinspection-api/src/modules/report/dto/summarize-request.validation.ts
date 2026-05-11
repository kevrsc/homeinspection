import { BadRequestException } from '@nestjs/common';
import type { ReportUploadResponseDto } from './extraction-response.dto';

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

  return { pageCount, sections: outSections };
}
