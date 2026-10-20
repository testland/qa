// The slug reader must pick out component names without mistaking the prose
// that real descriptions wrap around them for more names.

import { describe, expect, it } from 'vitest';
import { listedSlugs } from './description-drift.ts';

const slugs = (desc: string): string[] => listedSlugs(desc).map((s) => `${s.kind}:${s.slug}`);

describe('listedSlugs', () => {
  it('reads a plain skills / agents enumeration', () => {
    expect(slugs('X: 2 skills (dbt-testing, soda-checks) and 1 agent (schema-diff-reviewer).')).toEqual([
      'skill:dbt-testing',
      'skill:soda-checks',
      'agent:schema-diff-reviewer',
    ]);
  });

  it('reads a slug followed by a dash, connector, or nested parenthetical', () => {
    expect(
      slugs('skills (risk-matrix - the umbrella; k6-load-testing with thresholds; the axe-a11y umbrella (five engines))'),
    ).toEqual(['skill:risk-matrix', 'skill:k6-load-testing', 'skill:axe-a11y']);
  });

  it('ignores prose items and hyphenated prose words', () => {
    expect(
      slugs(
        '1 agent (migration-blast-radius-reviewer - DDL review: post-migration ANALYZE, lock-time estimates) ' +
          'and skills (from-CI-failure specs, and the review checklist; 30-60-90 onboarding)',
      ),
    ).toEqual(['agent:migration-blast-radius-reviewer']);
  });

  it('only reads parentheses that follow "skill(s)" or "agent(s)"', () => {
    expect(slugs('Distinct from qa-shift-right (feature-flag-experiment-validator); macOS (xcuitest-suite).')).toEqual([]);
  });
});
