import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ResultsPage } from './ResultsPage';

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

const validJson = {
  pageCount: 1,
  sections: [
    { sectionName: 'roof', observations: [{ text: 'Shingle wear at ridge.' }] },
  ],
};

function renderResults(state: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/results', state }]}>
      <Routes>
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ResultsPage', () => {
  it('shows Get AI summary when upload JSON parses as success', async () => {
    renderResults({ json: validJson });
    expect(
      await screen.findByRole('button', { name: /Get AI summary/i }),
    ).toBeInTheDocument();
  });

  it('does not show summarize button when payload is invalid', async () => {
    renderResults({ json: { bad: true } });
    expect(await screen.findByText(/Could not read results/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Get AI summary/i })).toBeNull();
  });
});
