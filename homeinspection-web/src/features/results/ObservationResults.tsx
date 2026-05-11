import { useEffect, useState } from 'react';
import type { SectionDto, UploadSuccessPayload } from './uploadSuccessModel';
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

function SectionObservations({
  section,
  sectionIndex,
}: {
  section: SectionDto;
  sectionIndex: number;
}) {
  const headingId = `section-heading-${sectionIndex}-${encodeURIComponent(section.sectionName)}`;

  return (
    <section
      className="min-w-0 space-y-3"
      aria-labelledby={headingId}
    >
      <h2
        id={headingId}
        className="break-words text-lg font-semibold tracking-tight text-fg"
      >
        {formatSectionHeading(section.sectionName)}
      </h2>
      <ul className="space-y-2">
        {section.observations.map((obs, oIdx) => (
          <li
            key={`${sectionIndex}-${oIdx}`}
            tabIndex={0}
            className="flex gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-3 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link sm:p-4"
          >
            <ObservationBadge />
            <p className="min-w-0 flex-1 break-words text-base leading-relaxed text-fg">
              {obs.text}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Props = {
  data: UploadSuccessPayload;
};

export function ObservationResults({ data }: Props) {
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  useEffect(() => {
    setActiveSectionIndex(0);
  }, [data]);

  const totalObs = data.sections.reduce(
    (n, s) => n + s.observations.length,
    0,
  );

  const activeSection = data.sections[activeSectionIndex];

  return (
    <div className="min-w-0 max-w-full space-y-8">
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
      ) : (
        <div className="min-w-0 lg:grid lg:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] lg:items-start lg:gap-x-8">
          <nav
            className="mb-6 hidden min-w-0 border-border lg:mb-0 lg:block lg:border-r lg:pr-4"
            aria-label="Report sections"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
              Sections
            </p>
            <ul className="space-y-1">
              {data.sections.map((sec, i) => (
                <li key={`nav-${i}-${sec.sectionName}`}>
                  <button
                    type="button"
                    aria-current={i === activeSectionIndex ? 'true' : undefined}
                    className={`w-full rounded-[var(--radius-input)] px-2 py-2 text-left text-sm outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link ${
                      i === activeSectionIndex
                        ? 'border border-border bg-surface font-medium text-fg'
                        : 'border border-transparent text-fg-muted hover:bg-page hover:text-fg'
                    }`}
                    onClick={() => setActiveSectionIndex(i)}
                  >
                    <span className="break-words">
                      {formatSectionHeading(sec.sectionName)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 lg:min-h-0">
            <div className="space-y-8 lg:hidden">
              {data.sections.map((sec, i) => (
                <SectionObservations
                  key={`mobile-${i}-${sec.sectionName}`}
                  section={sec}
                  sectionIndex={i}
                />
              ))}
            </div>

            <div className="hidden min-w-0 lg:block">
              {activeSection ? (
                <SectionObservations
                  section={activeSection}
                  sectionIndex={activeSectionIndex}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
