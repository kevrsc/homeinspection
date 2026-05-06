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

**Direction 5 / split layout:** UX allows a richer large-screen layout later. **Master–detail split at `lg` is [Story 4.7](../../_bmad-output/implementation-artifacts/4-7-responsive-polish-and-optional-lg-master-detail-layout.md)—not part of Story 4.2.** This story only ships a **single-column**, mobile-first **`AppShell`**; responsive splits belong in 4.7.

## Layout shell

`src/layout/AppShell.tsx`: `min-h-screen`, centered column, `max-w-3xl` → `lg:max-w-4xl`, horizontal padding **`px-4 sm:px-6`**. Routed pages render inside `<Outlet />`.

## References

- UX backlog: [`../../docs/ux-backlog.md`](../../docs/ux-backlog.md) (UX-DR9, DR4/DR5).
- Web README (env / proxy): [`../README.md`](../README.md).
