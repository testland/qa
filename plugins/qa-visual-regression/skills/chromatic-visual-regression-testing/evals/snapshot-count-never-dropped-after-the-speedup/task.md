# Three weeks on the changed-only mode and the bill has not moved

## Problem Description

`pathfinder-ui` has 1,240 stories. Three weeks ago we turned on the changed-only
mode so that a PR touching one component would stop photographing the entire
library. Billing since then: 8,703 snapshots across nine merged PRs. Before we
turned it on we averaged about 1,240 per PR. So, functionally, nothing happened.

Radek's position out of the retro is that the feature is marketing, that we
should switch it back off, and that since we pay per photograph either way we
should stop failing builds on changed screenshots as well - at least then the
spend buys us something and nobody sits waiting on a review. It is the only
concrete proposal anybody has made and I am fairly close to signing it off.

What is stopping me is that two of the nine did drop: 3327 came in at 9
snapshots and 3329 at 14. So the machinery evidently works when it works, and I
want to know what is different about the other seven before I give up on it.

`reports/snapshot-usage.md` is the per-PR breakdown Mei pulled off the build
list. `logs/branch-log.txt` is the commit history of each of those nine branches
as they stood when they ran. Everything else in this dump is the repo as it is
today.

What I need is a per-PR answer, not a general one. For each of the seven that
photographed everything, say what specifically caused that PR to photograph
everything. Then split those causes into the ones that are the tool behaving as
designed - in which case I will tell Radek to live with it - and the ones that
are us holding it wrong, which I expect you to actually fix in this dump.

## Output Specification

1. Write `docs/snapshot-usage-audit.md`: one row per full-rebuild PR with its
   specific cause, then a clear split between causes inherent to how the mode
   works and causes that are ours to fix, and roughly how many of the 8,703
   snapshots the fixable ones account for.
2. Make the repo changes that eliminate the avoidable full rebuilds.
3. State plainly what you are NOT changing and why.

## Input Files

Extract the following files before beginning.

=============== FILE: reports/snapshot-usage.md ===============
# Snapshot usage, merged PRs since the config change (2026-08-21)

| PR   | Branch                    | Files changed                                                      | Snapshots |
|------|---------------------------|--------------------------------------------------------------------|-----------|
| 3311 | badge-label-spacing       | `src/components/Badge.tsx`, `package.json`                          | 1240      |
| 3314 | theme-provider-decorator  | `.storybook/preview.jsx`                                            | 1240      |
| 3317 | table-density             | `src/components/Table.tsx`                                          | 1240      |
| 3319 | variable-font-swap        | `public/fonts/Inter-Variable.woff2`, `src/components/Text.tsx`       | 1240      |
| 3322 | a11y-addon                | `.storybook/main.js`                                                 | 1240      |
| 3323 | storybook-8               | `package.json`, `.storybook/main.js`                                 | 1240      |
| 3324 | card-radius               | `src/components/Card.tsx`, `package.json`                            | 1240      |
| 3327 | modal-focus-trap          | `src/components/Modal.tsx`                                           | 9         |
| 3329 | tooltip-delay             | `src/components/Tooltip.tsx`, `src/components/Tooltip.stories.tsx`   | 14        |

Total: 8,703 snapshots.

=============== FILE: logs/branch-log.txt ===============
$ for b in $(cat /tmp/merged-branches); do echo "== $b"; git log --oneline --first-parent main..origin/$b; done
(captured 2026-09-02, before the branches were deleted)

== 3311 badge-label-spacing
9f1a044 feat(badge): tighten the label spacing at small size
2c70b81 chore(deps): move date-fns onto the 4.x line

== 3314 theme-provider-decorator
5d3b2ae chore(storybook): wrap every story in the theme provider

== 3317 table-density
4b9e1c2 Merge branch 'main' into table-density
7e0cd51 feat(table): compact density option
a10f9c7 fix(table): keep the header sticky when compact

== 3319 variable-font-swap
b4477de chore(assets): replace the static font files with the variable build
61d0a02 feat(text): use the variable axis for weight

== 3322 a11y-addon
77c3e10 chore(storybook): add the accessibility addon to the addons list

== 3323 storybook-8
0aa51e3 chore: move the storybook packages to 8.3.5
f2b1c99 chore(storybook): update main.js for the 8.x framework field

== 3324 card-radius
3ccb1a7 feat(card): round the outer corners
d90e88e chore(deps): date-fns 3.6 -> 4.1

== 3327 modal-focus-trap
5a01f7c fix(modal): restore focus to the trigger on close

== 3329 tooltip-delay
b7e2d54 feat(tooltip): configurable open delay
1d3ff02 test(tooltip): story for the delayed variant

=============== FILE: chromatic.config.json ===============
{
  "$schema": "https://www.chromatic.com/config-file.schema.json",
  "buildScriptName": "build-storybook",
  "storybookBuildDir": "storybook-static",
  "onlyChanged": true,
  "exitZeroOnChanges": false
}

=============== FILE: .github/workflows/visual.yml ===============
name: visual

on:
  pull_request:
  push:
    branches: [main]

jobs:
  visual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm install

      - run: npm run build-storybook

      - name: Snapshots
        env:
          CHROMATIC_PROJECT_TOKEN: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
        run: npx chromatic

=============== FILE: .gitignore ===============
node_modules/
storybook-static/
coverage/
.env
.env.local
package-lock.json
*.log

=============== FILE: package.json ===============
{
  "name": "pathfinder-ui",
  "version": "9.2.0",
  "private": true,
  "scripts": {
    "build-storybook": "storybook build",
    "test": "node --test test/"
  },
  "dependencies": {
    "date-fns": "4.1.0",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "@storybook/addon-a11y": "8.3.5",
    "@storybook/addon-essentials": "8.3.5",
    "@storybook/react-vite": "8.3.5",
    "chromatic": "11.10.2",
    "storybook": "8.3.5",
    "vite": "5.4.8"
  }
}

=============== FILE: .storybook/main.js ===============
export default {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  staticDirs: ['../public'],
};

=============== FILE: .storybook/preview.jsx ===============
import React from 'react';
import { ThemeProvider } from '../src/theme/ThemeProvider';

export const decorators = [
  (Story) => React.createElement(ThemeProvider, { mode: 'light' }, React.createElement(Story)),
];

export const parameters = { layout: 'centered' };

=============== FILE: src/theme/tokens.mjs ===============
export const SCALE = [0, 2, 4, 8, 12, 16, 24, 32, 48, 64];

export function space(step) {
  if (!Number.isInteger(step) || step < 0 || step >= SCALE.length) {
    throw new RangeError(`space(${step}) is outside the scale`);
  }
  return `${SCALE[step]}px`;
}

=============== FILE: test/tokens.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { space, SCALE } from '../src/theme/tokens.mjs';

test('maps a step to its pixel value', () => {
  assert.equal(space(0), '0px');
  assert.equal(space(4), '12px');
  assert.equal(space(SCALE.length - 1), '64px');
});

test('rejects a step off the end of the scale', () => {
  assert.throws(() => space(SCALE.length), RangeError);
  assert.throws(() => space(-1), RangeError);
});

test('rejects a non-integer step', () => {
  assert.throws(() => space(1.5), RangeError);
});
