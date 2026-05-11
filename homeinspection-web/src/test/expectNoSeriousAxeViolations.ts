import { axe } from 'jest-axe';
import { expect } from 'vitest';

type AxeReport = Awaited<ReturnType<typeof axe>>;

const SERIOUS_IMPACT = new Set(['critical', 'serious']);

function seriousViolations(results: AxeReport) {
  return results.violations.filter(
    (v: AxeReport['violations'][number]) =>
      v.impact !== undefined && SERIOUS_IMPACT.has(v.impact),
  );
}

/**
 * Policy (Story 4.8): fail CI on new **critical** or **serious** axe violations.
 * Moderate/minor findings are reported in the raw `results` object for visibility only.
 *
 * `color-contrast` is skipped here: JSDOM does not compute layout/CSS reliably enough for
 * axe’s contrast engine — verify contrast manually or with a browser/extension run (see
 * `docs/accessibility-testing.md`).
 */
export async function axeDomFriendly(container: Element): Promise<AxeReport> {
  return axe(container, {
    rules: {
      'color-contrast': { enabled: false },
    },
  });
}

export async function expectNoSeriousAxeViolations(container: Element) {
  const results = await axeDomFriendly(container);
  const bad = seriousViolations(results);
  expect(
    bad,
    bad.length === 0
      ? undefined
      : bad
          .map(
            (v: AxeReport['violations'][number]) =>
              `[${v.impact}] ${v.id}: ${v.help}\n${v.nodes.map((n) => n.html).join('\n')}`,
          )
          .join('\n---\n'),
  ).toEqual([]);
}
