# Story 4.8: WCAG 2.2 AA baseline and automated accessibility checks

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an accessibility-conscious maintainer,  
I want core flows to meet WCAG 2.2 AA targets with automated regression signal,  
So that keyboard, contrast, and focus visibility requirements are sustained (UX-DR8).

## Acceptance Criteria

1. **AC1 — Automated regression**  
   **Given** upload, error, and success views implemented,  
   **When** **`npm run test`** runs in **`homeinspection-web/`**,  
   **Then** axe-core (via jest-axe) executes against representative **`/`** and **`/results`** renders and **fails on `critical` or `serious`** violations per policy in **`docs/accessibility-testing.md`**.

2. **AC2 — CI**  
   **When** CI runs for **`homeinspection-web`** changes,  
   **Then** **`lint`**, **`build`**, and **`test`** execute successfully (GitHub Actions workflow at **`.github/workflows/web-ci.yml`**).

3. **AC3 — Contrast caveat**  
   **Then** documentation explains why **`color-contrast`** is skipped under JSDOM and how to verify contrast manually or with browser tooling.

4. **AC4 — Manual spot-check guidance**  
   **Then** VoiceOver / NVDA spot-check steps for critical paths are documented (**`docs/accessibility-testing.md`**).

5. **AC5 — Focus visibility**  
   **Then** existing Direction 1 interactive targets retain **`focus-visible`** outlines (`src/index.css`); automated axe suite covers representative states without new serious regressions.

## Tasks / Subtasks

- [x] **T1 — Dependencies & Vitest environment** (AC: 1)  
  - [x] **`jsdom`**, **`@testing-library/react`**, **`@testing-library/user-event`**, **`@testing-library/jest-dom`**, **`jest-axe`**.

- [x] **T2 — Helpers & specs** (AC: 1, 5)  
  - [x] **`src/test/setup.ts`** — RTL cleanup + jest-dom matchers.  
  - [x] **`src/test/expectNoSeriousAxeViolations.ts`** — axe wrapper + **`color-contrast`** disabled under DOM limits.  
  - [x] **`src/a11y/coreFlows.a11y.spec.tsx`** — upload initial, client validation, structured error, results success, results invalid.

- [x] **T3 — Documentation** (AC: 3–4)  
  - [x] **`homeinspection-web/docs/accessibility-testing.md`**.

- [x] **T4 — CI workflow** (AC: 2)  
  - [x] **`.github/workflows/web-ci.yml`**.

- [x] **T5 — Product docs** (AC: 3–4)  
  - [x] **`README.md`**, **`docs/design-foundations.md`** cross-links.

## Dev Notes

### References

| Topic | Source |
|-------|--------|
| Epic Story 4.8 | [`epics.md`](../planning-artifacts/epics.md) |
| UX-DR8 | [`docs/ux-backlog.md`](../../docs/ux-backlog.md) |

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Completion Notes List

- **`vite.config.ts`**: global **`environment: 'jsdom'`** + **`setupFiles`** for RTL — existing unit specs remain compatible.
- File inputs under JSDOM: **`assignFilesToInput`** helper sets `files` + **`fireEvent.change`** for reliable **`onChange`** in validation test.

### File List

- `.github/workflows/web-ci.yml`
- `homeinspection-web/package.json` / `package-lock.json`
- `homeinspection-web/vite.config.ts`
- `homeinspection-web/src/test/setup.ts`
- `homeinspection-web/src/test/expectNoSeriousAxeViolations.ts`
- `homeinspection-web/src/a11y/coreFlows.a11y.spec.tsx`
- `homeinspection-web/docs/accessibility-testing.md`
- `homeinspection-web/README.md`
- `homeinspection-web/docs/design-foundations.md`

## Change Log

- **2026-05-11:** Story **4.8** implemented — axe regression suite, accessibility doc, Web CI workflow; sprint **`4-8-*`** → **done** (lint/build/test green).

---

_Ultimate context engine analysis completed — comprehensive developer guide created._
