type Props = {
  visible: boolean;
};

/**
 * Indeterminate processing banner — pairs bounded-wait copy (NFR1-aligned) with a spinner that stops animating under `prefers-reduced-motion`.
 */
export function UploadProcessingStatus({ visible }: Props) {
  if (!visible) {
    return null;
  }

  return (
    <div
      className="rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-fg"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0" aria-hidden>
          {/* Spinner hidden when user prefers reduced motion */}
          <span className="motion-safe:inline-flex motion-reduce:hidden motion-safe:size-5 motion-safe:animate-spin motion-safe:rounded-full motion-safe:border-2 motion-safe:border-link motion-safe:border-t-transparent" />
          <span className="motion-safe:hidden motion-reduce:inline text-xl leading-none text-link">
            ●
          </span>
        </span>
        <div className="space-y-1">
          <p className="font-medium text-fg">Processing your inspection PDF</p>
          <p className="text-fg-muted">
            For typical prototype workloads, this usually finishes in{' '}
            <strong className="font-medium text-fg">about 30 seconds</strong>
            — it may finish sooner, or return an error if the report cannot be
            processed.
          </p>
        </div>
      </div>
    </div>
  );
}
