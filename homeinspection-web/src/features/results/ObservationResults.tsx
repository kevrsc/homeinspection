import type { UploadSuccessPayload } from './uploadSuccessModel';
import { formatSectionHeading } from './uploadSuccessModel';

/** Inline icon + visible label — satisfies non-color-only cue (paired with text per UX-DR4). */
function ObservationBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-page px-2 py-0.5 text-xs font-medium text-fg-muted">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-fg-muted"
        aria-hidden
      >
        <path
          d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-fg">Observation</span>
    </span>
  );
}

type Props = {
  data: UploadSuccessPayload;
};

export function ObservationResults({ data }: Props) {
  const totalObs = data.sections.reduce(
    (n, s) => n + s.observations.length,
    0,
  );

  return (
    <div className="space-y-8">
      {typeof data.pageCount === 'number' ? (
        <p className="text-sm text-fg-muted">
          Parsed from{' '}
          <span className="font-medium text-fg">{data.pageCount}</span>{' '}
          report page{data.pageCount === 1 ? '' : 's'}.
        </p>
      ) : null}

      {totalObs === 0 ? (
        <p className="text-base text-fg-muted">
          No observations were returned for this report.
        </p>
      ) : null}

      {data.sections.map((section, sIdx) => {
        const headingId = `section-heading-${sIdx}-${encodeURIComponent(section.sectionName)}`;
        return (
          <section
            key={`${section.sectionName}-${sIdx}`}
            className="space-y-3"
            aria-labelledby={headingId}
          >
            <h2
              id={headingId}
              className="text-lg font-semibold tracking-tight text-fg"
            >
              {formatSectionHeading(section.sectionName)}
            </h2>
            <ul className="space-y-2">
              {section.observations.map((obs, oIdx) => (
                <li
                  key={`${sIdx}-${oIdx}`}
                  tabIndex={0}
                  className="flex gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-3 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link sm:p-4"
                >
                  <ObservationBadge />
                  <p className="min-w-0 flex-1 text-base leading-relaxed text-fg">
                    {obs.text}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
