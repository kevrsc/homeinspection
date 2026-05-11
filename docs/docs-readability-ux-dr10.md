# Docs readability — UX-DR10 deferral (Phase 1)

**Status:** No standalone docs site or site generator is wired in this repository yet. API prose continues to ship as Markdown beside code (`homeinspection-api/docs/`, OpenAPI descriptions, PRD/architecture artifacts).

## Deferral rationale

- **Infra:** There is no deployed documentation UI in Epic 4 scope; adding a generator (e.g. VitePress, Docusaurus) would be net-new CI, hosting, and navigation decisions.
- **Content:** Long-form narrative already lives in versioned Markdown; integrators consume files directly or via Git hosting UIs.

## Adoption checklist (when a docs site exists)

1. **Measure width:** Constrain article column to **~72ch** for body text; keep code blocks full-width within the content column or use horizontal scroll with sufficient contrast.
2. **Headings:** One **`h1`** per page; step down levels without skips (`h2` → `h3`, etc.).
3. **Code blocks:** Meet **WCAG 2.2 AA** contrast for default light theme; if a dark theme ships, validate both. Reuse Direction 1 neutral palette from `homeinspection-web/src/index.css` as a starting point or document Direction 4 overrides.
4. **Link this backlog item:** [`ux-backlog.md`](ux-backlog.md) **UX-DR10**.

## References

- Story: [`../_bmad-output/implementation-artifacts/4-9-docs-readability-theme-when-a-docs-site-ships-ux-dr10.md`](../_bmad-output/implementation-artifacts/4-9-docs-readability-theme-when-a-docs-site-ships-ux-dr10.md)
- Web design foundations (tone / spacing patterns): [`../homeinspection-web/docs/design-foundations.md`](../homeinspection-web/docs/design-foundations.md)
