# Nine minutes of snapshots on every PR, and the fast mode already burned us once

## Problem Description

Our design system repo (`@harborlight/ds`, 1,180 stories) photographs the whole
library on every pull request. It takes between 8 and 11 minutes and it is the
slowest thing in the pipeline by a distance - the unit job finishes in 40
seconds. Most PRs here touch one component. Our plan renews in six weeks and we
are at 71% of the snapshot allowance with half the quarter left.

You should know what happened in July before you suggest anything.

Week of the 14th we had the changed-only mode switched on. On the 17th, Nadia
changed one value in `tokens/semantic.css` - the neutral border went from
`#d9dde3` to `#cfd4dc`. Her PR photographed four stories, came back clean, and
merged. It moved the edge of every card, every table and every input in the
library, and we found out when a customer's design lead sent us a screenshot.
We turned the mode back off the same afternoon. Priya has said she will not sign
off on switching it back on unless somebody can explain that specific miss, so
"the vendor says it is safe" is not going to land.

Two proposals on the table now.

Ravi wants to cut what we photograph: drop the 130 kitchen-sink stories, and
take the three viewports down to one. That is maybe seven minutes back. I would
take that trade if it is the only thing on offer, though I would rather not.

Dan wants the CI step to hand the build off and return straight away instead of
sitting there waiting for the comparison to come back. He says we get the nine
minutes back today with a one-word change and reviewers can look at the result
in the web UI whenever they get to it. He has been pushing this in standup for
three weeks and "I don't like it" has not worked, so I need something I can
actually say back to him.

Get me the time back and give me a straight answer on both proposals.

## Output Specification

1. Rewrite `.github/workflows/visual.yml` so a PR that touches one component
   stops paying for the whole library.
2. Update `chromatic.config.json` to match.
3. Write `docs/visual-ci-notes.md`: what changed and why, an explanation of the
   17 July miss specific enough for Priya to sign off on, and the answers to
   Ravi's proposal and Dan's, in a form I can read out in standup.

Leave `scripts/build-tokens.mjs` and `test/build-tokens.test.mjs` alone; they
pass today and they are not what this is about.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/visual.yml ===============
name: visual

on:
  pull_request:
  push:
    branches: [main]

jobs:
  snapshots:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm

      - run: npm ci

      - run: npm run build:tokens

      - run: npm run build-storybook

      - name: Snapshots
        env:
          CHROMATIC_PROJECT_TOKEN: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
        run: npx chromatic --storybook-build-dir=storybook-static

=============== FILE: chromatic.config.json ===============
{
  "$schema": "https://www.chromatic.com/config-file.schema.json",
  "buildScriptName": "build-storybook",
  "storybookBuildDir": "storybook-static"
}

=============== FILE: .gitignore ===============
node_modules/
storybook-static/
public/tokens.css
coverage/
*.log

=============== FILE: package.json ===============
{
  "name": "@harborlight/ds",
  "version": "4.7.2",
  "private": true,
  "scripts": {
    "build:tokens": "node scripts/build-tokens.mjs",
    "build-storybook": "storybook build",
    "test": "node --test test/"
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
  staticDirs: ['../public'],
};

=============== FILE: .storybook/preview-head.html ===============
<link rel="stylesheet" href="/tokens.css" />

=============== FILE: tokens/semantic.css ===============
:root {
  --hl-border-neutral: #cfd4dc;
  --hl-surface-raised: #ffffff;
  --hl-text-muted: #667085;
  --hl-focus-ring: #3b5bdb;
}

=============== FILE: src/components/Card.tsx ===============
import type { ReactNode } from 'react';
import './Card.css';

export function Card({ title, body, elevation = 0 }: { title: string; body: ReactNode; elevation?: number }) {
  return (
    <section className="hl-card" data-elevation={elevation}>
      <h3 className="hl-card__title">{title}</h3>
      <div className="hl-card__body">{body}</div>
    </section>
  );
}

=============== FILE: src/components/Card.css ===============
.hl-card {
  border: 1px solid var(--hl-border-neutral);
  background: var(--hl-surface-raised);
  border-radius: 8px;
  padding: 16px;
}

.hl-card__title {
  color: var(--hl-text-muted);
  font-size: 14px;
}

=============== FILE: src/components/Card.stories.tsx ===============
import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta: Meta<typeof Card> = { component: Card, title: 'Surfaces/Card' };
export default meta;

export const Default: StoryObj<typeof Card> = {
  args: { title: 'Quarterly usage', body: 'Snapshots consumed this period.' },
};

export const Raised: StoryObj<typeof Card> = {
  args: { title: 'Raised', body: 'Elevated surface.', elevation: 2 },
};

=============== FILE: scripts/build-tokens.mjs ===============
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function mergeTokenFiles(sources) {
  const seen = new Map();
  for (const css of sources) {
    for (const [, name, value] of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      seen.set(name, value.trim());
    }
  }
  return `:root {\n${[...seen].map(([n, v]) => `  ${n}: ${v};`).join('\n')}\n}\n`;
}

export function buildTokens(srcDir = 'tokens', outFile = 'public/tokens.css') {
  const sources = readdirSync(srcDir)
    .filter((f) => f.endsWith('.css'))
    .sort()
    .map((f) => readFileSync(join(srcDir, f), 'utf8'));
  mkdirSync('public', { recursive: true });
  const out = mergeTokenFiles(sources);
  writeFileSync(outFile, out);
  return out;
}

if (process.argv[1]?.endsWith('build-tokens.mjs')) buildTokens();

=============== FILE: test/build-tokens.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeTokenFiles } from '../scripts/build-tokens.mjs';

test('merges declarations from every source file', () => {
  const out = mergeTokenFiles([':root { --a: 1px; }', ':root { --b: red; }']);
  assert.match(out, /--a: 1px;/);
  assert.match(out, /--b: red;/);
});

test('later files win on a repeated name', () => {
  const out = mergeTokenFiles([':root { --a: 1px; }', ':root { --a: 2px; }']);
  assert.match(out, /--a: 2px;/);
  assert.doesNotMatch(out, /--a: 1px;/);
});

test('emits a single root block', () => {
  const out = mergeTokenFiles([':root { --a: 1px; }', ':root { --b: red; }']);
  assert.equal(out.match(/:root/g).length, 1);
});
