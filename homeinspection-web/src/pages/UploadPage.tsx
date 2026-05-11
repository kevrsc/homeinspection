import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadReportPdf } from '../api/uploadReport';
import { readWebConfig } from '../config';
import { UploadErrorPanel } from '../features/upload/UploadErrorPanel';
import {
  parseUploadFailure,
  summarizeUploadFailureForAnnouncement,
  type ParsedUploadFailure,
} from '../features/upload/parseUploadFailure';
import { UploadProcessingStatus } from '../features/upload/UploadProcessingStatus';
import { MAX_UPLOAD_BYTES } from '../features/upload/uploadLimits';
import { validatePdfFile } from '../features/upload/validatePdfFile';

const MAX_MB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

function validationMessage(reason: 'type' | 'size'): string {
  if (reason === 'size') {
    return `This file is larger than ${MAX_MB} MB. Choose a smaller PDF or compress the report.`;
  }
  return 'Choose a PDF file — accepted format is PDF only.';
}

export function UploadPage() {
  const navigate = useNavigate();
  const [cfg] = useState(() => readWebConfig());
  const [busy, setBusy] = useState(false);
  const [clientValidationError, setClientValidationError] = useState<
    string | null
  >(null);
  const [serverFailure, setServerFailure] =
    useState<ParsedUploadFailure | null>(null);
  const [failureAnnouncement, setFailureAnnouncement] = useState('');

  useEffect(() => {
    if (!serverFailure) {
      setFailureAnnouncement('');
      return;
    }
    setFailureAnnouncement(
      summarizeUploadFailureForAnnouncement(serverFailure),
    );
  }, [serverFailure]);

  function runValidation(file: File): boolean {
    const result = validatePdfFile(file);
    if (!result.ok) {
      setClientValidationError(validationMessage(result.reason));
      return false;
    }
    setClientValidationError(null);
    return true;
  }

  function onFileChange(files: FileList | null) {
    const picked = files?.[0];
    setServerFailure(null);
    if (!picked) {
      setClientValidationError(null);
      return;
    }
    runValidation(picked);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerFailure(null);
    const input = (e.currentTarget.elements.namedItem('pdf') as HTMLInputElement)
      ?.files?.[0];
    if (!input) {
      setClientValidationError('Choose a PDF file first.');
      return;
    }

    if (!runValidation(input)) {
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
      const httpStatus =
        typeof ex.status === 'number' && Number.isFinite(ex.status)
          ? ex.status
          : 0;
      setServerFailure(parseUploadFailure(ex.body, httpStatus));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="space-y-6">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {failureAnnouncement}
      </div>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-fg">
          Upload inspection PDF
        </h1>
        <p className="text-base leading-relaxed text-fg-muted">
          Phase 2 — uploads send{' '}
          <code className="rounded bg-page px-1 py-0.5 text-sm">
            multipart/form-data
          </code>{' '}
          field <code className="rounded bg-page px-1 py-0.5 text-sm">file</code>{' '}
          to{' '}
          <code className="rounded bg-page px-1 py-0.5 text-sm">
            POST /v1/report/upload
          </code>
          .
        </p>
      </header>

      <section
        className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm leading-relaxed text-fg sm:p-5"
        aria-labelledby="upload-constraints-heading"
      >
        <h2 id="upload-constraints-heading" className="sr-only">
          File requirements
        </h2>
        <p className="font-medium text-fg">Before you choose a file</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-fg-muted marker:text-fg-muted">
          <li>
            <span className="text-fg">Format:</span> PDF inspection reports only.
          </li>
          <li>
            <span className="text-fg">Maximum size:</span> {MAX_MB} MB per upload.
          </li>
        </ul>
      </section>

      <form className="space-y-4" onSubmit={onSubmit} aria-busy={busy}>
        <div className="space-y-2">
          <label
            htmlFor="pdf"
            className="block text-sm font-medium text-fg"
          >
            Inspection PDF
          </label>
          <input
            id="pdf"
            name="pdf"
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy}
            onChange={(ev) => onFileChange(ev.target.files)}
            className="block w-full max-w-md rounded-[var(--radius-input)] border border-border bg-surface px-3 py-2 text-base text-fg file:mr-3 file:rounded file:border-0 file:bg-page file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-fg"
          />
        </div>

        {clientValidationError ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {clientValidationError}
          </p>
        ) : null}

        <UploadProcessingStatus visible={busy} />

        <button
          type="submit"
          disabled={busy}
          className="min-h-11 min-w-[11rem] rounded-[var(--radius-input)] bg-link px-4 py-2.5 text-base font-medium text-white hover:opacity-95 disabled:hover:opacity-60"
        >
          {busy ? 'Working…' : 'Upload'}
        </button>
      </form>

      {serverFailure ? <UploadErrorPanel failure={serverFailure} /> : null}
    </main>
  );
}
