# Accessibility testing (homeinspection-web)

Aligned with [`docs/ux-backlog.md`](../../docs/ux-backlog.md) **UX-DR8** and Epic **4** Story **4.8**.

## Automated checks (CI)

- **`npm run test`** includes **`src/a11y/coreFlows.a11y.spec.tsx`**, which runs [**axe-core**](https://github.com/dequelabs/axe-core) (via [**jest-axe**](https://github.com/nickcolley/jest-axe)) against representative renders:
  - **`/`** — upload (initial)
  - **`/`** — upload after client-side validation failure (**`role="alert"`**)
  - **`/`** — upload after structured server error (**`UploadErrorPanel`**)
  - **`/results`** — successful observation payload
  - **`/results`** — invalid / unrecognized payload

### Failure policy

- **Blocking:** Any axe finding with **`impact`** **`critical`** or **`serious`** fails the suite.
- **Non-blocking:** Moderate and minor findings do not fail CI today; treat them as hygiene backlog unless promoted by policy.

### `color-contrast` rule

Axe’s **`color-contrast`** rule is **disabled** in automated runs because JSDOM does not model layout and computed styles reliably enough for trustworthy contrast math.

**Manual verification** (each release or theming change):

1. Open **`/`** and **`/results`** (success path) in Chromium.
2. Run **axe DevTools** or **Lighthouse** accessibility audit with contrast checks enabled.
3. Confirm **WCAG 2.2 AA** contrast for body copy and interactive controls on the **Direction 1** palette (`src/index.css`), or document **Direction 4** token overrides if adopted later.

## Manual spot checks (screen readers)

Use **one** desktop browser + **VoiceOver** (macOS) **or** **NVDA** (Windows) per milestone:

| Path | Steps |
|------|--------|
| Upload | Tab to file control and primary button; activate Upload without a file — verify **`role="alert"`** surfaces validation. |
| Upload → error | Trigger structured failure (or mock) — verify **`Could not upload`** heading is reached before auxiliary metadata; **Copy request ID** is reachable and announces feedback (`aria-live="polite"`). |
| Upload → success | Navigate **`/results`** — verify section headings and observation rows are announced; **`tabIndex={0}`** rows are reachable in order (**`lg`** layout: section buttons precede detail rows). |
| Disclaimer | Confirm **`ResultsDisclaimerStrip`** primary copy is outside **`details`** and readable without expanding elaboration. |

## References

- Story artifact: [`4-8-wcag-2-2-aa-baseline-and-automated-accessibility-checks.md`](../../_bmad-output/implementation-artifacts/4-8-wcag-2-2-aa-baseline-and-automated-accessibility-checks.md)
- Helper: `src/test/expectNoSeriousAxeViolations.ts`
