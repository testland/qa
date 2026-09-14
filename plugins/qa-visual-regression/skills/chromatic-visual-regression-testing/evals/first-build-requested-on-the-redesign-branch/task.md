# Finish Ravi's rollout wiring so I can circulate the plan on Thursday

## Problem Description

`harbor-app` is finally getting snapshot coverage. The package is installed, the
project exists on the vendor side, the token is in repo secrets as
`CHROMATIC_PROJECT_TOKEN`. Ravi did the wiring last week and then went on leave
until the 22nd, so what is in this dump is his: `.github/workflows/visual.yml`
and `chromatic.config.json`.

The thing I keep being asked about is the bill. We are on the 5,000-snapshot
starter plan and the library is 1,140 stories, so Ravi was counting every
photograph and you should assume I will be asked to justify each one on Thursday.

`reports/vendor-project.md` is what the project page says as of this morning.
`docs/nav-v2-status.md` is where `redesign/nav-v2` actually is.

Ravi's handover note, verbatim, so you know what he was going for:

> 1. First build runs off `redesign/nav-v2`, not `main`. `main` still carries
>    the 2023 navigation and we delete it the week after next - it would be silly
>    to spend the rollout recording the old design as the thing we measure
>    everything against. Run it on the branch and the new nav is what we compare
>    to from day one.
> 2. I limited that first build to the nav stories. Paying for 1,140 photographs
>    on a run nobody is going to open is most of a month's allowance, and the nav
>    is the only thing changing.
> 3. The PR step is on dry-run for now. Gives us a week of watching the wiring
>    behave without spending anything. Flip it off when we are happy.
> 4. Auto-accept is on. When `redesign/nav-v2` lands, that build comes back with
>    a few hundred changed stories, because the nav chrome is on nearly every
>    screen. Priya signed off the Figma file on 2026-09-02 and nobody is going to
>    sit and click accept a few hundred times.
> 5. Changed-only mode stays on. Sasha wants it off - "photograph everything
>    every time and then we cannot miss anything" - and I said no, on cost.

What I want from you is the finished wiring and the plan. The plan is what I am
presenting, so it has to hold up in front of Priya and our release manager: it
needs to say which branch the first build runs on, and what happens in what
order during merge week.

## Output Specification

1. Write `.github/workflows/visual.yml`.
2. Write `chromatic.config.json`.
3. Write `docs/visual-rollout.md`: take Ravi's five points one at a time and
   state what the delivered wiring does about each, say which branch the first
   build runs on and why that branch, and give the ordered sequence for merge
   week.

Do not touch `src/nav/breakpoints.mjs` or `test/breakpoints.test.mjs`.

## Input Files

Extract the following files before beginning.

=============== FILE: reports/vendor-project.md ===============
# harbor-app - project page, pulled 2026-09-11

| Field                         | Value                          |
|-------------------------------|--------------------------------|
| Project created               | 2026-09-08 by ravi@harbor.test |
| Token added to repo secrets   | 2026-09-09                     |
| Plan                          | Starter - 5,000 snapshots/mo   |
| Snapshots this billing period | 0 / 5,000                      |
| Builds                        | 0                              |
| Baseline                      | none                           |
| Linked branches               | none                           |

=============== FILE: docs/nav-v2-status.md ===============
# redesign/nav-v2 - status as of 2026-09-11

Branch off `main` at `a71f004`, 38 commits ahead, not merged. Target: merge
week of 2026-09-21.

### Open review threads: 14

Unresolved, across 6 files. Four are on visual behaviour: the focus ring on the
account menu, the divider weight in the collapsed rail, the hover transition
timing, and the avatar fallback initials.

### Open defects

| ID      | Summary                                                                 | State       |
|---------|-------------------------------------------------------------------------|-------------|
| NAV-218 | Mobile drawer overlaps the sticky header at 390px; header is unreachable | fix pending |
| NAV-224 | Account menu renders behind the page content in Safari 17               | fix pending |

### Design

Priya approved the Figma file on 2026-09-02.

### Scope

The nav chrome renders in the shell around nearly every route, so roughly 300 of
the app's 1,140 stories change appearance when this branch lands. The other ~840
are unrelated to this work and are untouched by the branch.

=============== FILE: chromatic.config.json ===============
{
  "$schema": "https://www.chromatic.com/config-file.schema.json",
  "buildScriptName": "build-storybook",
  "onlyChanged": true,
  "onlyStoryNames": ["Navigation/*", "Shell/*"],
  "autoAcceptChanges": true
}

=============== FILE: .github/workflows/visual.yml ===============
name: visual

on:
  push:
    branches: [redesign/nav-v2]
  pull_request:

jobs:
  visual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm

      - run: npm ci

      - run: npm run build-storybook

      - name: Snapshots
        env:
          CHROMATIC_PROJECT_TOKEN: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
        run: npx chromatic --dry-run

=============== FILE: package.json ===============
{
  "name": "harbor-app",
  "version": "6.0.3",
  "private": true,
  "scripts": {
    "build-storybook": "storybook build",
    "test": "node --test"
  },
  "devDependencies": {
    "@storybook/react-vite": "8.3.5",
    "chromatic": "11.10.2",
    "storybook": "8.3.5",
    "vite": "5.4.8"
  }
}

=============== FILE: .storybook/main.js ===============
export default {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: { name: '@storybook/react-vite', options: {} },
};

=============== FILE: src/nav/breakpoints.mjs ===============
export const BREAKPOINTS = { xs: 390, sm: 640, md: 768, lg: 1024, xl: 1440 };

export function drawerMode(width) {
  if (!Number.isFinite(width) || width <= 0) throw new RangeError('width must be positive');
  return width < BREAKPOINTS.md ? 'overlay' : 'rail';
}

export function snapshotWidths() {
  return Object.values(BREAKPOINTS).sort((a, b) => a - b);
}

=============== FILE: test/breakpoints.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { drawerMode, snapshotWidths, BREAKPOINTS } from '../src/nav/breakpoints.mjs';

test('390 is the narrowest supported width', () => {
  assert.equal(snapshotWidths()[0], 390);
  assert.equal(BREAKPOINTS.xs, 390);
});

test('the drawer overlays below the md breakpoint', () => {
  assert.equal(drawerMode(390), 'overlay');
  assert.equal(drawerMode(767), 'overlay');
});

test('the drawer becomes a rail at md and above', () => {
  assert.equal(drawerMode(768), 'rail');
  assert.equal(drawerMode(1440), 'rail');
});

test('rejects a nonsense width', () => {
  assert.throws(() => drawerMode(0), RangeError);
  assert.throws(() => drawerMode(NaN), RangeError);
});
