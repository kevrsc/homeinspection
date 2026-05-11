import { useEffect, useState } from 'react';
import { summarizeObservationsPayload } from '../../api/summarizeReport';
import { readWebConfig } from '../../config';
import { UploadErrorPanel } from '../upload/UploadErrorPanel';
import {
  parseUploadFailure,
  summarizeUploadFailureForAnnouncement,
  type ParsedUploadFailure,
} from '../upload/parseUploadFailure';
import type { ObservationSummary } from './observationSummaryModel';
import type { UploadSuccessPayload } from './uploadSuccessModel';

type SummarizePhase = 'idle' | 'loading' | 'success' | 'error';

type Props = {
  uploadPayload: UploadSuccessPayload;
};

export function AiSummarySection({ uploadPayload }: Props) {
  const [cfg] = useState(() => readWebConfig());
  const [phase, setPhase] = useState<SummarizePhase>('idle');
  const [summary, setSummary] = useState<ObservationSummary | null>(null);
  const [failure, setFailure] = useState<ParsedUploadFailure | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!failure) {
      setAnnouncement('');
      return;
    }
    setAnnouncement(
      summarizeUploadFailureForAnnouncement(failure, 300, 'summary'),
    );
  }, [failure]);

  async function onRequestSummary() {
    setFailure(null);
    setPhase('loading');
    setAnnouncement('Requesting AI summary.');
    try {
      const data = await summarizeObservationsPayload(
        uploadPayload,
        cfg.apiBaseUrl,
        {
          authMode: cfg.authMode,
          mockHeaderName: cfg.mockHeaderName,
          mockHeaderValue: cfg.mockHeaderValue,
          apiKey: cfg.apiKey,
        },
      );
      setSummary(data);
      setPhase('success');
      setAnnouncement('AI summary loaded.');
    } catch (err) {
      const ex = err as Error & { status?: number; body?: unknown };
      const httpStatus =
        typeof ex.status === 'number' && Number.isFinite(ex.status)
          ? ex.status
          : 0;
      setFailure(parseUploadFailure(ex.body, httpStatus));
      setPhase('error');
    }
  }

  const showSummary = phase === 'success' && summary !== null;
  const disableButton = phase === 'loading';

  return (
    <section
      className="min-w-0 max-w-full space-y-3"
      aria-label="Optional AI summary"
    >
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="button"
          disabled={disableButton}
          onClick={() => void onRequestSummary()}
          aria-describedby="ai-summary-hint"
          className="min-h-11 min-w-[11rem] shrink-0 rounded-[var(--radius-input)] bg-link px-4 py-2.5 text-base font-medium text-white hover:opacity-95 disabled:hover:opacity-60"
        >
          {disableButton ? 'Working…' : 'Get AI summary'}
        </button>
        <p
          id="ai-summary-hint"
          className="max-w-prose text-sm leading-relaxed text-fg-muted"
        >
          Optional. Typical wait is up to about{' '}
          <strong className="font-medium text-fg">30 seconds</strong>.
        </p>
      </div>

      {phase === 'loading' ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-fg">
          <p className="font-medium text-fg">Requesting summary</p>
          <p className="mt-1 text-fg-muted">
            This step can take up to about 30 seconds for typical workloads.
          </p>
        </div>
      ) : null}

      {failure ? (
        <UploadErrorPanel failure={failure} variant="summarize" />
      ) : null}

      {showSummary ? (
        <div className="min-w-0 max-w-full space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5">
          <h3 className="text-lg font-semibold tracking-tight text-fg">
            Summary
          </h3>
          <p className="break-words text-base leading-relaxed text-fg">
            {summary.executiveSummary}
          </p>
          <div className="space-y-2">
            <p className="text-sm font-medium text-fg-muted">
              Prioritized items
            </p>
            <ol className="list-decimal space-y-3 pl-5 text-base leading-relaxed text-fg">
              {[...summary.prioritizedItems]
                .sort((a, b) => a.rank - b.rank)
                .map((item) => (
                  <li key={item.rank} className="break-words pl-1">
                    <span className="font-semibold text-fg">{item.title}</span>
                    <span className="text-fg-muted"> (rank {item.rank})</span>
                    <p className="mt-1 text-base font-normal leading-relaxed text-fg">
                      {item.rationale}
                    </p>
                  </li>
                ))}
            </ol>
          </div>
        </div>
      ) : null}
    </section>
  );
}
