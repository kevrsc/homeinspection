/**
 * UX-DR7 / Story 4.6 — persistent low-emphasis framing on successful observation views.
 * Primary obligations stay visible in the strip; elaboration lives in `<details>` (never modal-only).
 */
export function ResultsDisclaimerStrip() {
  return (
    <aside
      className="min-w-0 max-w-full rounded-[var(--radius-card)] border border-border bg-page px-4 py-3 text-sm leading-relaxed shadow-none sm:px-5"
      aria-labelledby="results-disclaimer-heading"
    >
      <h2 id="results-disclaimer-heading" className="sr-only">
        Important notice about these results
      </h2>
      <p className="break-words text-fg">
        <strong className="font-medium text-fg">Starting point only:</strong>{' '}
        These observations are a practical to-do list helper—not legal advice,
        not a complete safety assessment, and not a substitute for reading your
        full inspection report or consulting licensed professionals when it
        matters.
      </p>
      <details className="mt-3 border-t border-border pt-3 text-fg-muted">
        <summary className="cursor-pointer text-sm font-medium text-link underline-offset-2 hover:underline">
          How to use this list
        </summary>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          Prioritize follow-ups with contractors or specialists as needed. When
          an item seems urgent or unclear, refer back to the original PDF report
          and photos from your inspector—the extracted text here may miss nuance
          or context from the full write-up.
        </p>
      </details>
    </aside>
  );
}
