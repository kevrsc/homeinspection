import { useEffect, useState } from 'react';
import type { ParsedUploadFailure } from './parseUploadFailure';

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* attempt fallback */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

type Props = {
  failure: ParsedUploadFailure;
};

export function UploadErrorPanel({ failure }: Props) {
  const [copyFeedback, setCopyFeedback] = useState('');

  useEffect(() => {
    if (!copyFeedback) return;
    const id = window.setTimeout(() => setCopyFeedback(''), 3500);
    return () => window.clearTimeout(id);
  }, [copyFeedback]);

  async function onCopyRequestId(requestId: string) {
    const ok = await copyTextToClipboard(requestId);
    setCopyFeedback(
      ok ? 'Request ID copied to clipboard.' : 'Could not copy request ID.',
    );
  }

  if (failure.kind === 'fallback') {
    return (
      <section
        className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5"
        aria-labelledby="upload-error-heading-fallback"
      >
        <h2
          id="upload-error-heading-fallback"
          className="text-lg font-semibold text-fg"
        >
          Could not upload
        </h2>
        <p className="text-base leading-relaxed text-fg">
          The server returned an error (HTTP <strong>{failure.httpStatus}</strong>
          ). Try again with a valid PDF under 20 MB, confirm your connection, and
          verify authentication matches the API configuration.
        </p>
        {failure.detailText ? (
          <details className="text-sm text-fg-muted">
            <summary className="cursor-pointer font-medium text-fg">
              Technical summary
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-[var(--radius-input)] bg-page p-3 font-mono text-xs text-fg">
              {failure.detailText}
            </pre>
          </details>
        ) : null}
      </section>
    );
  }

  const { code, message, requestId, details } = failure;

  return (
    <section
      className="space-y-4 rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5"
      aria-labelledby="upload-error-heading"
    >
      <h2 id="upload-error-heading" className="text-lg font-semibold text-fg">
        Could not upload
      </h2>

      <p className="text-base leading-relaxed text-fg">{message}</p>

      <dl className="grid gap-2 text-sm sm:grid-cols-[minmax(0,10rem)_1fr] sm:items-baseline">
        <dt className="font-medium text-fg-muted">Error code</dt>
        <dd className="font-mono text-sm text-fg">{code}</dd>
        {requestId ? (
          <>
            <dt className="font-medium text-fg-muted">Request ID</dt>
            <dd className="break-all font-mono text-sm text-fg">{requestId}</dd>
          </>
        ) : null}
      </dl>

      {requestId ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="min-h-11 rounded-[var(--radius-input)] border border-border bg-page px-4 py-2 text-sm font-medium text-fg hover:bg-surface"
            onClick={() => void onCopyRequestId(requestId)}
            aria-label="Copy request ID to clipboard"
          >
            Copy request ID
          </button>
          <span className="sr-only">
            Copies the request identifier so you can share it with support or file
            an issue.
          </span>
        </div>
      ) : null}

      {details !== undefined ? (
        <details className="text-sm text-fg-muted">
          <summary className="cursor-pointer font-medium text-fg">
            Technical details
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-[var(--radius-input)] bg-page p-3 font-mono text-xs text-fg">
            {JSON.stringify(details, null, 2)}
          </pre>
        </details>
      ) : null}

      <span aria-live="polite" className="sr-only">
        {copyFeedback}
      </span>
    </section>
  );
}
