/** Matches Phase 1 upload success schema (`openapi/openapi.json`, `upload-success.json`). */

export type ObservationDto = {
  text: string;
};

export type SectionDto = {
  sectionName: string;
  observations: ObservationDto[];
};

export type UploadSuccessPayload = {
  /** Present when API returns it (OpenAPI marks required; guard tolerates omission). */
  pageCount?: number;
  sections: SectionDto[];
};

export type ParseUploadSuccessResult =
  | { ok: true; data: UploadSuccessPayload }
  | { ok: false };

export function parseUploadSuccess(json: unknown): ParseUploadSuccessResult {
  if (!json || typeof json !== 'object') {
    return { ok: false };
  }

  const root = json as Record<string, unknown>;
  if (!Array.isArray(root.sections)) {
    return { ok: false };
  }

  const sections: SectionDto[] = [];

  for (const rawSection of root.sections) {
    if (!rawSection || typeof rawSection !== 'object') {
      return { ok: false };
    }
    const s = rawSection as Record<string, unknown>;
    if (typeof s.sectionName !== 'string') {
      return { ok: false };
    }
    if (!Array.isArray(s.observations)) {
      return { ok: false };
    }

    const observations: ObservationDto[] = [];
    for (const rawObs of s.observations) {
      if (!rawObs || typeof rawObs !== 'object') {
        return { ok: false };
      }
      const text = (rawObs as Record<string, unknown>).text;
      if (typeof text !== 'string') {
        return { ok: false };
      }
      observations.push({ text });
    }

    sections.push({ sectionName: s.sectionName, observations });
  }

  const payload: UploadSuccessPayload = { sections };
  const pc = root.pageCount;
  if (typeof pc === 'number' && Number.isFinite(pc)) {
    payload.pageCount = pc;
  }

  return { ok: true, data: payload };
}

/** Human-readable section heading from API slug (e.g. `roof` → `Roof`, `hvac-unit` → `Hvac Unit`). */
export function formatSectionHeading(sectionName: string): string {
  const trimmed = sectionName.trim();
  if (!trimmed) return 'Untitled section';
  return trimmed
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
