# Design foundations (Story 4.2)

Canonical tokens and breakpoints for **`homeinspection-web`**. Direction **1** (calm neutral) is the default baseline; higher-numbered directions are override-friendly via CSS variables.

## Breakpoints

Aligned with **Breakpoint Strategy** in [`../../_bmad-output/planning-artifacts/ux-design-specification.md`](../../_bmad-output/planning-artifacts/ux-design-specification.md) (Tailwind-style defaults):

| Token | Width |
|-------|-------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |

**Implementation:** `src/index.css` `@theme` (`--breakpoint-*`) drives Tailwind responsive prefixes; `src/theme/breakpoints.ts` exports `BREAKPOINTS_PX` for JS/tests—keep these in sync.

## Token philosophy

1. **Single source:** Semantic colors, radii, and breakpoints live in **`@theme`** in `src/index.css`. Tailwind utilities (`bg-page`, `text-fg`, `border-border`, etc.) map from `--color-*` and `--radius-*`.
2. **Direction 1 palette (documented defaults):**

   | Role | Variable | Default |
   |------|-----------|---------|
   | Page background | `--color-page` | `#f8fafc` |
   | Surface / card | `--color-surface` | `#ffffff` |
   | Border | `--color-border` | `#e2e8f0` |
   | Primary text | `--color-fg` | `#0f172a` |
   | Muted text | `--color-fg-muted` | `#64748b` |
   | Link / primary control fill | `--color-link` | `#2563eb` |
   | Danger (reserved) | `--color-danger` | `#b91c1c` |
   | Caution (reserved) | `--color-caution` | `#b45309` |

3. **Radii:** `--radius-card` / `--radius-input` default **6px**—subtle, not pill-heavy.
4. **Typography:** `html` **16px** minimum; `font-sans` uses **system UI** stack (`system-ui`, Segoe UI, Roboto, …). Stepped scale in UI uses Tailwind utilities aligned to roles:

   | Role | Typical utilities | Approx. size |
   |------|-------------------|----------------|
   | Page title | `text-3xl font-semibold` | ~1.875rem |
   | Section heading | `text-lg font-semibold` | ~1.125rem |
   | Body | `text-base` | 1rem (16px) |
   | Caption / meta | `text-sm` | ~0.875rem |

5. **Spacing:** Tailwind’s spacing scale is **4px-based**; layouts use **`space-y-*`** / padding steps where **8px** is the default rhythm between related items and **16–24px** (`space-y-4` / `space-y-6`) for section separation—matching UX spacing guidance.

## Override hooks: Direction 4 (high contrast) / Direction 5

**Direction 4 (high contrast):** Prefer **not** rewriting components—override semantic variables on the root (or a wrapper with higher specificity). Example pattern:

```css
/* e.g. data-theme="high-contrast" on <html> */
[data-theme='high-contrast'] {
  --color-page: #000000;
  --color-surface: #0a0a0a;
  --color-border: #ffffff;
  --color-fg: #ffffff;
  --color-fg-muted: #e5e5e5;
  --color-link: #93c5fd;
}
```

Tune contrast pairs to meet audit targets; keep **semantic names** stable so utilities (`bg-page`, `text-fg`, …) pick up new values.

**Direction 5 / split layout:** Optional **`lg`** master–detail for observations ships in [**Story 4.7**](../../_bmad-output/implementation-artifacts/4-7-responsive-polish-and-optional-lg-master-detail-layout.md); Story **4.2** established single-column mobile-first **`AppShell`**.

## Layout shell

`src/layout/AppShell.tsx`: **`overflow-x-hidden`**, **`min-w-0`** content column, `max-w-3xl` → **`lg:max-w-6xl`**, padding **`px-4 sm:px-6`** → **`lg:px-8`**. Routed pages render inside `<Outlet />`.

## Upload constraints & bounded wait (Story 4.3 / UX-DR6)

- **Constraints-before-picker:** The upload route surfaces **PDF-only** and **20 MB max** in plain language **before** the user activates the file input — aligned with [`docs/ux-backlog.md`](../../docs/ux-backlog.md) **UX-DR6** and server docs [`failure-matrix.md`](../../homeinspection-api/docs/api/failure-matrix.md).
- **Client mirrors:** `src/features/upload/uploadLimits.ts` exports **`MAX_UPLOAD_BYTES`** (same literal intent as Nest upload limits); `validatePdfFile` rejects oversized/wrong-type selections before `fetch`.
- **Bounded waiting:** During submission, copy references **about 30 seconds** as a typical prototype upper bound (**NFR1** in [`prd.md`](../../_bmad-output/planning-artifacts/prd.md)) — **not** framed as a guarantee.
- **Reduced motion:** `UploadProcessingStatus` uses **`motion-safe:` / `motion-reduce:`** Tailwind variants so spinners drop to a static indicator when **`prefers-reduced-motion: reduce`**.

## Structured upload errors (Story 4.4 / UX-DR5)

- **Envelope:** Matches Phase 1 JSON (`failure-matrix.md`): **`error.code`**, **`error.message`**, **`error.requestId`**, optional **`error.details`** — normalized via **`parseUploadFailure`** in `src/features/upload/parseUploadFailure.ts`.
- **Presentation:** **`UploadErrorPanel`** leads with API **`message`**, shows **`code`** as labeled metadata, and **`requestId`** as readable text plus **Copy request ID** (`navigator.clipboard.writeText` with **`execCommand('copy')`** fallback).
- **Announcements:** `UploadPage` hosts a dedicated **`aria-live="polite"`** `sr-only` region fed by **`summarizeUploadFailureForAnnouncement`** — separate from `UploadProcessingStatus` **`role="status"`** processing copy so polite announcements stay distinct (partial **UX-DR8**).
- **Precedence:** **Client** validation (`role="alert"`) vs **server** failures (`UploadErrorPanel`) — clearing file selection or starting a new submit clears server-side failure state without overwriting inline validation semantics.

## Observation results list (Story 4.5 / UX-DR4)

- **Shape:** **`parseUploadSuccess`** in `src/features/results/uploadSuccessModel.ts` validates **`sections[]`** with **`sectionName`** + **`observations[].text`** (aligned with OpenAPI / [`upload-success.json`](../../homeinspection-api/test/fixtures/json/upload-success.json)); **`pageCount`** optional at runtime.
- **Layout (narrow):** Stacked sections — calm-neutral cards (`border-border`, `bg-surface`), **`h2`** per section.
- **`lg` (Story 4.7):** Optional **master–detail** — left **`nav`** section rail (`aria-label="Report sections"`), right detail pane for **`activeSectionIndex`**; **no `position: sticky`** — avoids focus-trap risk called out in [`ux-backlog.md`](../../docs/ux-backlog.md) **UX-DR9**.
- **Badges:** Each row includes an inline **Observation** label plus list icon — **visible text**, not color-only status (API does not yet expose severity; badge is informational).
- **Keyboard:** Section buttons precede observation rows at **`lg`**; each observation **`<li tabIndex={0}>`** retains **`focus-visible:outline-*`**.

## Responsive polish (Story 4.7 / UX-DR9)

- **Anti-overflow:** **`UploadPage`** / **`ResultsPage`** **`main`** use **`min-w-0 max-w-full`**; long **`pre`** stays **`overflow-auto`**; prose **`break-words`** where unbroken strings could widen mobile viewports (**≥320px** goal).

## Automated accessibility baseline (Story 4.8 / UX-DR8)

- **Regression:** **`npm run test`** runs **`src/a11y/coreFlows.a11y.spec.tsx`** (axe-core via jest-axe); CI fails on new **`critical`** or **`serious`** violations (`expectNoSeriousAxeViolations`).
- **Contrast:** Automated runs disable axe **`color-contrast`** under JSDOM — verify with a browser extension / Lighthouse on Direction 1 tokens or document Direction 4 overrides (see [`accessibility-testing.md`](accessibility-testing.md)).

## Disclaimer strip (Story 4.6 / UX-DR7)

- **When:** Renders on **`ResultsPage`** only when **`parseUploadSuccess`** succeeds — invalid/debug payloads skip the strip (AC scopes to successful extraction).
- **Surface:** **`ResultsDisclaimerStrip`** — **`aside`** with **`bg-page`**, subtle **`border-border`**, compact typography; primary obligation copy stays **outside** **`<details>`** so nothing critical is modal-only or expand-exclusive.
- **Elaboration:** Optional **“How to use this list”** **`<details>`** block adds guidance without hiding the only disclaimer behind interaction.

## References

- UX backlog: [`../../docs/ux-backlog.md`](../../docs/ux-backlog.md) (UX-DR8/DR9, DR4/DR5).
- Accessibility testing notes: [`accessibility-testing.md`](accessibility-testing.md).
- Web README (env / proxy): [`../README.md`](../README.md).
