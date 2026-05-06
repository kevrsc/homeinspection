# Story 4.2: Design tokens and responsive layout shell

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a homeowner using phone or desktop,  
I want typography, spacing, and breakpoints aligned to the UX specification (`sm` / `md` / `lg`),  
So that later screens share a coherent Direction 1 baseline.

## Acceptance Criteria

1. **AC1 — Breakpoints match UX spec**  
   **Given** [*Breakpoint Strategy*](../planning-artifacts/ux-design-specification.md) in the UX Design Specification ( **`sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px** ),  
   **When** a developer inspects the web package theme/config,  
   **Then** those breakpoint names map to **those pixel widths** (not approximate substitutes).  
   **And** `homeinspection-web/README.md` (or `homeinspection-web/docs/design-foundations.md` if you add it) includes a short **breakpoint reference table** citing the UX spec.

2. **AC2 — Mobile-first shell**  
   **Given** [*Responsive Strategy*](../planning-artifacts/ux-design-specification.md),  
   **When** any routed page renders (`/` and `/results` today),  
   **Then** content uses **single-column**, mobile-first layout defaults (no mandatory multi-column chrome in this story).  
   **And** the root layout reserves sensible horizontal padding that scales at **`sm+`** (e.g. via Tailwind container/padding utilities—not prescriptive of exact class names).

3. **AC3 — Direction 1 design tokens**  
   **Given** [*Visual Design Foundation*](../planning-artifacts/ux-design-specification.md), [*Design Direction Decision*](../planning-artifacts/ux-design-specification.md) (Direction 1 calm-neutral baseline), and [`ux-design-directions.html`](../planning-artifacts/ux-design-directions.html),  
   **When** tokens are read from one canonical source (CSS variables and/or Tailwind theme mapping),  
   **Then** the following are defined for **default theme** (Direction 1 intent—airy, light borders, calm neutrals; exact hex values are team choice but must be **documented**):  
   - **Semantic colors:** at minimum background, surface/card, border, primary text, muted text, link/accent, and reserved semantic slots for **danger / caution** (even if unused until Story 4.4–4.5).  
   - **Radii** consistent with “calm neutral” UI (subtle, not pill-heavy unless spec dictates).  
   - **Typography:** **body minimum 16px** on mobile per UX spec; **system UI** stack as primary (`system-ui`, Segoe UI, Roboto, San Francisco fallbacks); stepped scale for **page title → section → body → caption/meta** (concrete `rem`/`px` steps documented).  
   - **Spacing:** grounded in **4px grid** with **8px** as default step between related items; section gaps in the **16–24px** band per spec—express via token scale or Tailwind spacing alignment.

4. **AC4 — Override hooks for Direction 4 / 5**  
   **Given** UX spec allows **Direction 4** (high contrast) if audits demand it and **Direction 5** split layout at large breakpoints later,  
   **When** reviewers read design docs in `homeinspection-web`,  
   **Then** there is a short subsection stating **how** to swap to Direction 4–biased tokens (e.g. darker canvas, stronger borders) **without** rewriting components—prefer CSS variables or theme aliases.  
   **And** note explicitly that **master–detail split at `lg`** is **Story 4.7**, not this story (no split-pane layout required here).

5. **AC5 — Tooling integrated with Vite**  
   **Given** Story 4.1 chose **Vite + React + TypeScript**,  
   **When** `npm run dev` and `npm run build` run,  
   **Then** **Tailwind CSS** is wired through official **Vite** integration (recommended: **`tailwindcss` + `@tailwindcss/vite`** for Tailwind v4, or equivalent documented setup).  
   **And** existing routes remain functional; pages **migrate** from ad hoc `index.css` layout rules to token-backed utilities where duplicated—**do not** drop accessibility of interactive elements (focus-visible preserved).

6. **AC6 — Verification gates**  
   **When** CI-local checks run in `homeinspection-web/`,  
   **Then** `npm run lint`, `npm run build`, and `npm run test` still **pass** after dependency and config changes.

## Tasks / Subtasks

- [x] **T1 — Add Tailwind + entry CSS** (AC: 5, 6)  
  - [x] Add dependencies and Vite plugin per Tailwind v4 docs (`@import "tailwindcss"` in entry stylesheet).  
  - [x] Remove or shrink redundant global rules in `src/index.css` superseded by utilities; keep only `@layer` resets / `:focus-visible` baseline if needed.

- [x] **T2 — Theme: breakpoints + tokens** (AC: 1, 3)  
  - [x] Map **`sm` / `md` / `lg` / `xl`** to **640 / 768 / 1024 / 1280** px—avoid drifting from UX spec “Tailwind-style defaults” footnote.  
  - [x] Implement Direction 1 palette + spacing + type scale via **`@theme`** (Tailwind v4) or `tailwind.config` theme extension—single source of truth.

- [x] **T3 — Layout shell** (AC: 2)  
  - [x] Introduce a small **`AppShell`** (or layout wrapper) wrapping routed pages: centered column, `min-h-screen`, consistent padding, optional **`max-w-*`** for comfortable reading (align with later ~72ch prose guidance where applicable—full prose caps are also UX-DR10 / Story 4.9).  
  - [x] Refactor **`UploadPage`** / **`ResultsPage`** to use shell + token-backed classes (no behavior change to upload logic).

- [x] **T4 — Documentation** (AC: 1, 4)  
  - [x] Document breakpoints table + token philosophy + Direction 4/5 override notes in **`README.md`** or **`docs/design-foundations.md`**.

- [x] **T5 — Regression check** (AC: 6)  
  - [x] Manual smoke: upload still works against API with existing env/proxy setup.

### Review Findings

_(Consolidated adversarial review — Blind Hunter, Edge Case Hunter, and Acceptance Auditor passes emulated in-session, 2026-05-06. Diff scope: `git diff HEAD` for tracked changes plus `git diff --no-index` for untracked Story 4.2 paths under `homeinspection-web/`.)_

- [x] [Review][Patch] Broaden `:focus-visible` base selectors beyond `a`, `button`, `input` — include `textarea`, `select`, and `summary` so future/native controls keep consistent keyboard focus rings (`homeinspection-web/src/index.css`).

- [x] [Review][Defer] Breakpoint reference tables appear in both `README.md` and `docs/design-foundations.md` — intentional redundancy; watch for drift when widths change.

- [x] [Review][Defer] Breakpoint widths live in `@theme` (`--breakpoint-*`) and in `BREAKPOINTS_PX` — CSS `@theme` is canonical for Tailwind; TS export is for JS/tests only.

- [x] [Review][Defer] `ResultsPage` renders full `JSON.stringify` output — large payloads may stress the main thread until structured observation UI lands.

- [x] [Review][Defer] WCAG contrast/focus audits not exhaustive for primary/disabled controls — defer to Story 4.8 baseline automation.

## Dev Notes

### Epic / backlog context

- **Maps:** UX-DR9 (breakpoints, mobile-first), foundational pieces for UX-DR4–DR8 (tokens before observation list + a11y hardening).  
- [`docs/ux-backlog.md`](../../docs/ux-backlog.md) rows **UX-DR9** and **UX-DR4** reference Direction 1 vs Direction 5 at `lg+`.

### UX specification excerpts (authoritative numbers)

From [**Breakpoint Strategy**](../planning-artifacts/ux-design-specification.md):

| Token | Width |
|--------|--------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |

**Spacing / layout:** 4px base grid; 8px default step; 16–24px between sections. **Mobile:** body **≥16px**; tap targets **≥44×44 CSS px** (enforce in Stories 4.3+ where controls multiply—shell should not prevent this).

### Previous story intelligence (4.1)

- Stack: **React 19**, **react-router-dom** v7, **`homeinspection-web/README.md`** covers proxy vs **`VITE_API_BASE_URL`**.  
- Files established: [`src/main.tsx`](../../homeinspection-web/src/main.tsx), [`src/index.css`](../../homeinspection-web/src/index.css), [`UploadPage.tsx`](../../homeinspection-web/src/pages/UploadPage.tsx).  
- **Do not** change API integration contracts in [`uploadReport.ts`](../../homeinspection-web/src/api/uploadReport.ts) unless required for unrelated fixes—prefer styling-only edits.

### Architecture compliance

- No **`homeinspection-api`** runtime changes.  
- SPA-only; tokens live in **`homeinspection-web`**.

### Library / framework requirements

- **Tailwind CSS** via **`@tailwindcss/vite`** (Tailwind **v4**) is the **recommended** path—matches UX spec’s “Tailwind-style defaults” and primes Radix/shadcn-class patterns later. If v4 proves incompatible with another constraint, document the fallback (v3 + PostCSS) in README **before** merging.

### File structure requirements

Suggested additions (adjust names if cleaner):

- `homeinspection-web/src/layout/AppShell.tsx`  
- `homeinspection-web/src/index.css` — `@import "tailwindcss";` + `@theme { … }` token definitions  
- Optional: `homeinspection-web/docs/design-foundations.md` for long-form token docs

### Testing requirements

- Existing **`vitest`** tests must pass; add tests only if low-cost (e.g. asserting breakpoint constants exported from a tiny `breakpoints.ts` module—**optional**).

### Project context reference

- [`project-context.md`](../project-context.md): env-driven config; avoid embedding secrets in client bundles beyond existing auth env patterns.

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

- Sprint auto-discovery: first **`backlog`** story after **4.1** → **4-2-design-tokens-and-responsive-layout-shell**.

### Completion Notes List

- **Tailwind v4:** `tailwindcss` + `@tailwindcss/vite` (^4.2.4); `@import 'tailwindcss'` and **`@theme`** tokens in `homeinspection-web/src/index.css`. `vite.config.ts` registers `tailwindcss()` alongside `@vitejs/plugin-react`.
- **Breakpoints:** `@theme` `--breakpoint-*` + `src/theme/breakpoints.ts` (`BREAKPOINTS_PX`) + `breakpoints.spec.ts` (Vitest)—640 / 768 / 1024 / 1280 px per UX spec.
- **Direction 1:** Semantic `--color-*`, `--radius-*`, system `font-sans`, base layer body/code/pre and **`:focus-visible`** outlines on interactive elements.
- **Shell:** `AppShell.tsx` wraps `<Outlet />`; `main.tsx` nests `/` and `/results` under shell; pages use token-backed utilities (`bg-page`, `text-fg`, etc.). Upload logic unchanged (`uploadReportPdf`, `readWebConfig`).
- **Docs:** `docs/design-foundations.md` (tokens, breakpoint table, Direction 4 override pattern, explicit **Story 4.7** master–detail note); README breakpoint table + link.
- **Verification:** `npm run lint`, `npm run build`, `npm run test` pass in `homeinspection-web/`. **T5:** Follow README **Run with API** for local upload smoke (proxy/env unchanged).

### File List

- `homeinspection-web/package.json`
- `homeinspection-web/package-lock.json`
- `homeinspection-web/vite.config.ts`
- `homeinspection-web/README.md`
- `homeinspection-web/docs/design-foundations.md`
- `homeinspection-web/src/index.css`
- `homeinspection-web/src/main.tsx`
- `homeinspection-web/src/layout/AppShell.tsx`
- `homeinspection-web/src/theme/breakpoints.ts`
- `homeinspection-web/src/theme/breakpoints.spec.ts`
- `homeinspection-web/src/pages/UploadPage.tsx`
- `homeinspection-web/src/pages/ResultsPage.tsx`

---

## Change Log

- **2026-05-06:** Story created via `bmad-create-story` (Epic 4 / Story 4.2 + UX spec Breakpoint / Visual Design sections).
- **2026-05-06:** Implementation complete — Tailwind v4 + `@theme` tokens, `AppShell`, breakpoint module/tests, design foundations doc + README breakpoint section; status → review.
- **2026-05-06:** Code review — applied patch extending `:focus-visible` to `textarea`/`select`/`summary` in `index.css`; story marked **done**.
