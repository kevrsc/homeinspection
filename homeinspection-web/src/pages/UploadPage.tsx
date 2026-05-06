import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadReportPdf } from '../api/uploadReport';
import { readWebConfig } from '../config';

export function UploadPage() {
  const navigate = useNavigate();
  const [cfg] = useState(() => readWebConfig());
  const [busy, setBusy] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDebugError(null);
    const input = (e.currentTarget.elements.namedItem('pdf') as HTMLInputElement)
      ?.files?.[0];
    if (!input) {
      setDebugError('Choose a PDF file first.');
      return;
    }

    setBusy(true);
    try {
      const json = await uploadReportPdf(input, cfg.apiBaseUrl, {
        authMode: cfg.authMode,
        mockHeaderName: cfg.mockHeaderName,
        mockHeaderValue: cfg.mockHeaderValue,
        apiKey: cfg.apiKey,
      });
      navigate('/results', { state: { json } });
    } catch (err) {
      const ex = err as Error & { status?: number; body?: unknown };
      const body =
        ex.body !== undefined
          ? typeof ex.body === 'string'
            ? ex.body
            : JSON.stringify(ex.body, null, 2)
          : ex.message;
      setDebugError(
        ex.status !== undefined ? `HTTP ${ex.status}\n${body}` : `${body}`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-fg">
          Upload inspection PDF
        </h1>
        <p className="text-base leading-relaxed text-fg-muted">
          Phase 2 scaffold — sends <code>multipart/form-data</code> field{' '}
          <code>file</code> to <code>POST /v1/report/upload</code>.
        </p>
      </header>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label
            htmlFor="pdf"
            className="block text-sm font-medium text-fg"
          >
            PDF file
          </label>
          <input
            id="pdf"
            name="pdf"
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy}
            className="block w-full max-w-md rounded-[var(--radius-input)] border border-border bg-surface px-3 py-2 text-base text-fg file:mr-3 file:rounded file:border-0 file:bg-page file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-fg"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 min-w-[8rem] rounded-[var(--radius-input)] bg-link px-4 py-2.5 text-base font-medium text-white hover:opacity-95 disabled:hover:opacity-60"
        >
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </form>

      {debugError && (
        <section className="space-y-2 border-t border-border pt-6">
          <h2 className="text-lg font-semibold text-fg">Response (error)</h2>
          <pre>{debugError}</pre>
        </section>
      )}
    </main>
  );
}
