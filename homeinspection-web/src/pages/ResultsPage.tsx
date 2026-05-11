import { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ObservationResults } from '../features/results/ObservationResults';
import { ResultsDisclaimerStrip } from '../features/results/ResultsDisclaimerStrip';
import { parseUploadSuccess } from '../features/results/uploadSuccessModel';

export function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const json = (location.state as { json?: unknown } | null)?.json;

  useEffect(() => {
    if (json === undefined) {
      navigate('/', { replace: true });
    }
  }, [json, navigate]);

  const parsed = useMemo(
    () => (json !== undefined ? parseUploadSuccess(json) : { ok: false as const }),
    [json],
  );

  if (json === undefined) {
    return null;
  }

  return (
    <main className="min-w-0 max-w-full space-y-6">
      <p>
        <Link
          to="/"
          className="text-base font-medium text-link underline-offset-2 hover:underline"
        >
          ← Upload another
        </Link>
      </p>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-fg">
          Inspection observations
        </h1>
        <p className="break-words text-sm leading-relaxed text-fg-muted">
          Section-grouped findings from your uploaded report (Direction 1 calm
          list baseline — UX-DR4).
        </p>
      </header>

      {parsed.ok ? (
        <>
          <ResultsDisclaimerStrip />
          <ObservationResults data={parsed.data} />
        </>
      ) : (
        <section
          className="min-w-0 max-w-full space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5"
          aria-labelledby="invalid-results-heading"
        >
          <h2
            id="invalid-results-heading"
            className="text-lg font-semibold text-fg"
          >
            Could not read results
          </h2>
          <p className="break-words text-base leading-relaxed text-fg">
            The API returned data this screen does not recognize. Try uploading
            again or contact support with your request details.
          </p>
          <details className="text-sm text-fg-muted">
            <summary className="cursor-pointer font-medium text-fg">
              Raw response (debug)
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-[var(--radius-input)] bg-page p-3 font-mono text-xs text-fg">
              {JSON.stringify(json, null, 2)}
            </pre>
          </details>
        </section>
      )}
    </main>
  );
}
