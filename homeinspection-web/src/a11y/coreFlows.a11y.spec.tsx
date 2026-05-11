import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as uploadApi from '../api/uploadReport';
import { AppShell } from '../layout/AppShell';
import { UploadPage } from '../pages/UploadPage';
import { ResultsPage } from '../pages/ResultsPage';
import { expectNoSeriousAxeViolations } from '../test/expectNoSeriousAxeViolations';

vi.mock('../api/uploadReport');

vi.mock('../config', () => ({
  readWebConfig: () => ({
    apiBaseUrl: '',
    authMode: 'mock' as const,
    mockHeaderName: 'X-Mock-Auth',
    mockHeaderValue: 'test',
    apiKey: '',
  }),
  normalizeApiBase: (raw: string | undefined) =>
    raw === undefined || raw === '' ? '' : raw.replace(/\/+$/, ''),
  uploadEndpoint: (base: string) =>
    base ? `${base.replace(/\/+$/, '')}/v1/report/upload` : '/v1/report/upload',
  summarizeEndpoint: (base: string) =>
    base
      ? `${base.replace(/\/+$/, '')}/v1/report/summarize`
      : '/v1/report/summarize',
}));

const UPLOAD_SUCCESS_FIXTURE = {
  pageCount: 1,
  sections: [
    {
      sectionName: 'roof',
      observations: [{ text: 'Damaged shingle near ridge.' }],
    },
    {
      sectionName: 'plumbing',
      observations: [{ text: 'Slow leak at shutoff valve.' }],
    },
  ],
};

/** JSDOM does not ship `DataTransfer`; assignment respects React's `onChange` FileList contract. */
function assignFilesToInput(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: Object.assign(files, {
      length: files.length,
      item(index: number) {
        return files[index] ?? null;
      },
      *[Symbol.iterator]() {
        for (const f of files) yield f;
      },
    }),
  });
}

function renderUploadShell(initialEntry: string | { pathname: string; state?: unknown }) {
  const entries = typeof initialEntry === 'string' ? [initialEntry] : [initialEntry];
  return render(
    <MemoryRouter initialEntries={entries}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<UploadPage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('axe — core flows (Story 4.8)', () => {
  afterEach(() => {
    vi.mocked(uploadApi.uploadReportPdf).mockReset();
  });

  it('upload page (initial) has no serious/critical axe violations', async () => {
    const { container } = renderUploadShell('/');
    await expectNoSeriousAxeViolations(container);
  });

  it('upload page with client validation alert has no serious/critical axe violations', async () => {
    const { container } = renderUploadShell('/');
    const input = screen.getByLabelText(/Inspection PDF/i) as HTMLInputElement;
    const bad = new File(['not a pdf'], 'readme.txt', { type: 'text/plain' });
    assignFilesToInput(input, [bad]);
    fireEvent.change(input);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await expectNoSeriousAxeViolations(container);
  });

  it('upload page with structured server error panel has no serious/critical axe violations', async () => {
    const user = userEvent.setup();
    vi.mocked(uploadApi.uploadReportPdf).mockRejectedValueOnce(
      Object.assign(new Error('Upload failed'), {
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Only PDF uploads are supported.',
            requestId: '00000000-0000-4000-8000-000000000000',
          },
        },
      }),
    );

    const { container } = renderUploadShell('/');
    const pdf = new File(['%PDF-1.4'], 'report.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText(/Inspection PDF/i), pdf);
    await user.click(screen.getByRole('button', { name: /^Upload$/ }));

    await screen.findByRole('heading', { name: /Could not upload/i });
    await expectNoSeriousAxeViolations(container);
  });

  it('results page (success) has no serious/critical axe violations', async () => {
    const { container } = renderUploadShell({
      pathname: '/results',
      state: { json: UPLOAD_SUCCESS_FIXTURE },
    });

    await screen.findByRole('heading', { name: /Inspection observations/i });
    await expectNoSeriousAxeViolations(container);
  });

  it('results page (invalid payload) has no serious/critical axe violations', async () => {
    const { container } = renderUploadShell({
      pathname: '/results',
      state: { json: { unexpectedShape: true } },
    });

    await screen.findByRole('heading', { name: /Could not read results/i });
    await expectNoSeriousAxeViolations(container);
  });
});
