# The screenshot branch has been green for eight days and the rebrand is in three weeks

## Problem Description

`ledger-console` is our customer-facing app: 47 Cypress specs, all green, about
six minutes on every PR. In three weeks we replace the colour palette, the type
scale and the button shapes. The specs assert on roles and text, so they will
stay green through all of that and we will hear about the damage from customers.

Two people have had a go at fixing that.

Jo built what is in `cypress/support/visual.mjs`: `cy.screenshot()` in the six
specs listed in `docs/rebrand-screens.md`, PNG baselines committed under
`cypress/baselines/`, and a `pixelmatch` comparison registered as a `cy.task`.
It has been running on `spike/visual-jo` for eight days, roughly 40 CI runs, and
has never once gone red. Jo reads that as the app being visually stable, and I
am fairly close to just merging it - it is sixty lines, it runs today, and money
is not the argument either way. The one thing nagging me is that Marta pushed a
button-radius change onto that branch on Tuesday to see what the step would say,
and the step went green. She has not had time to look at why, and she is on
leave until the 24th.

Ash wants Storybook stood up in this repo with stories for those same six
screens. They are not components - they are routed screens behind auth that read
from the database - so that is a mocking project, not a story-writing project,
and I do not have three weeks of anyone's time for it.

Cost is genuinely not a constraint here: we already pay for Chromatic on the
design-system repo, seats are spare, a project has been created for this repo
and the token is in this repo's secrets as `CHROMATIC_PROJECT_TOKEN`.

Give me the shortest route to having those six screens compared on every PR
into `main`. The 47 specs have to keep passing and I am not paying for 47 specs
to be rewritten. And tell me straight what happens to Jo's work, because Jo
leaves in November and I need to know whether we are inheriting it.

## Output Specification

1. Wire the per-PR comparison into `.github/workflows/e2e.yml`, with whatever
   `package.json` change that needs.
2. Leave the repo consistent with whatever you decide about
   `cypress/support/visual.mjs` and `test/visual.test.mjs`. `npm test`
   (`node --test test/`) must pass when you are finished.
3. Write `docs/visual-coverage-plan.md`: which of the six screens are in the
   first pass, any that are not with the specific reason and what would have to
   change for it to be included, a direct answer to Ash's proposal, and a direct
   answer on Jo's branch that I can forward to Jo.

Leave `src/format/money.mjs` and `test/money.test.mjs` alone.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/rebrand-screens.md ===============
# Screens that must not break in the rebrand

| # | Route                | Spec                               | Data                                          |
|---|----------------------|------------------------------------|-----------------------------------------------|
| 1 | `/login`             | `cypress/e2e/login.cy.js`          | none; static, no session                       |
| 2 | `/settings/profile`  | `cypress/e2e/profile.cy.js`        | `cy.task('db:seed', 'user-fixture')`           |
| 3 | `/invoices/INV-1042` | `cypress/e2e/invoice.cy.js`        | `cy.task('db:seed', 'invoice-fixture')`        |
| 4 | `/invoices` (empty)  | `cypress/e2e/invoices-empty.cy.js` | `cy.task('db:seed', 'empty-tenant')`           |
| 5 | `/error/500`         | `cypress/e2e/error.cy.js`          | none; rendered directly                        |
| 6 | `/dashboard`         | `cypress/e2e/dashboard.cy.js`      | not seeded; reads the shared staging database  |

=============== FILE: cypress/support/visual.mjs ===============
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Runners come down with a clean checkout, so re-seed there rather than fight
// font rendering differences between the runner image and our laptops.
export function shouldSeedBaseline(baselinePath, env = process.env) {
  return !existsSync(baselinePath) || Boolean(env.CI);
}

export function compareOrSeed(baselineDir, name, actualBytes, diffFn, env = process.env) {
  const baselinePath = join(baselineDir, `${name}.png`);
  if (shouldSeedBaseline(baselinePath, env)) {
    mkdirSync(baselineDir, { recursive: true });
    writeFileSync(baselinePath, actualBytes);
    return { status: 'seeded', diffPixels: 0 };
  }
  const diffPixels = diffFn(readFileSync(baselinePath), actualBytes);
  return { status: diffPixels === 0 ? 'match' : 'diff', diffPixels };
}

=============== FILE: test/visual.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { shouldSeedBaseline, compareOrSeed } from '../cypress/support/visual.mjs';

const fixtureDir = () => mkdtempSync(join(tmpdir(), 'ledger-visual-'));

test('seeds when there is no baseline for that name yet', () => {
  assert.equal(shouldSeedBaseline(join(fixtureDir(), 'login.png'), {}), true);
});

test('compares when a baseline is already present', () => {
  const dir = fixtureDir();
  writeFileSync(join(dir, 'login.png'), Buffer.from('baseline'));
  assert.equal(shouldSeedBaseline(join(dir, 'login.png'), {}), false);
});

test('reports a difference when the captured bytes differ', () => {
  const dir = fixtureDir();
  writeFileSync(join(dir, 'login.png'), Buffer.from('baseline'));
  const out = compareOrSeed(dir, 'login', Buffer.from('actual'), () => 812, {});
  assert.equal(out.status, 'diff');
  assert.equal(out.diffPixels, 812);
});

=============== FILE: cypress.config.js ===============
import { defineConfig } from 'cypress';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { seed } from './cypress/support/seed.js';
import { compareOrSeed } from './cypress/support/visual.mjs';

const diffFn = (a, b) => {
  const left = PNG.sync.read(a);
  const right = PNG.sync.read(b);
  const out = new PNG({ width: left.width, height: left.height });
  return pixelmatch(left.data, right.data, out.data, left.width, left.height, { threshold: 0.1 });
};

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL,
    supportFile: 'cypress/support/e2e.js',
    video: false,
    setupNodeEvents(on) {
      on('task', {
        'db:seed': (fixture) => seed(fixture),
        'visual:compare': ({ name, image }) =>
          compareOrSeed('cypress/baselines', name, Buffer.from(image, 'base64'), diffFn),
      });
    },
  },
});

=============== FILE: .github/workflows/e2e.yml ===============
name: e2e

on:
  pull_request:
  push:
    branches: [main]

jobs:
  cypress:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm

      - run: npm ci

      - run: npm run build

      - name: Cypress
        run: npm run e2e
        env:
          CYPRESS_BASE_URL: https://staging.ledger-console.internal

      - name: Screenshot comparison (spike branch only)
        if: github.ref == 'refs/heads/spike/visual-jo'
        run: npm run e2e:visual
        env:
          CYPRESS_BASE_URL: https://staging.ledger-console.internal

=============== FILE: package.json ===============
{
  "name": "ledger-console",
  "version": "3.8.1",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "e2e": "cypress run",
    "e2e:visual": "cypress run --spec cypress/e2e/login.cy.js,cypress/e2e/profile.cy.js,cypress/e2e/invoice.cy.js,cypress/e2e/invoices-empty.cy.js,cypress/e2e/error.cy.js,cypress/e2e/dashboard.cy.js",
    "test": "node --test test/"
  },
  "devDependencies": {
    "cypress": "13.15.0",
    "pixelmatch": "6.0.0",
    "pngjs": "7.0.0",
    "vite": "5.4.8"
  }
}

=============== FILE: cypress/e2e/login.cy.js ===============
describe('login', () => {
  it('renders the sign-in form', () => {
    cy.visit('/login');
    cy.findByRole('heading', { name: 'Sign in' }).should('be.visible');
    cy.findByLabelText('Work email').should('be.enabled');
    cy.findByRole('button', { name: 'Continue' }).should('be.enabled');
    cy.screenshot('login', { capture: 'viewport' });
  });

  it('rejects an unknown address', () => {
    cy.visit('/login');
    cy.findByLabelText('Work email').type('nobody@example.com');
    cy.findByRole('button', { name: 'Continue' }).click();
    cy.findByRole('alert').should('contain.text', 'We do not recognise that address');
  });
});

=============== FILE: cypress/e2e/dashboard.cy.js ===============
describe('dashboard', () => {
  beforeEach(() => {
    cy.login('finance-lead@acme.test');
  });

  it('shows how fresh the figures are', () => {
    cy.visit('/dashboard');
    cy.contains(/Updated \d+ minutes? ago/).should('be.visible');
    cy.screenshot('dashboard', { capture: 'viewport' });
  });

  it('links through to overdue invoices', () => {
    cy.visit('/dashboard');
    cy.findByRole('link', { name: /overdue/i }).click();
    cy.location('pathname').should('eq', '/invoices');
  });

  it('renders the rolling 24 hour volume chart', () => {
    cy.visit('/dashboard');
    cy.findByTestId('volume-sparkline').should('exist');
    cy.findByTestId('open-invoice-count').should('not.have.text', '');
  });
});

=============== FILE: src/format/money.mjs ===============
export function formatMinorUnits(minor, currency = 'EUR', locale = 'en-IE') {
  if (!Number.isInteger(minor)) throw new TypeError('minor units must be an integer');
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minor / 100);
}

export function sumMinorUnits(values) {
  return values.reduce((total, v) => {
    if (!Number.isInteger(v)) throw new TypeError('minor units must be an integer');
    return total + v;
  }, 0);
}

=============== FILE: test/money.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMinorUnits, sumMinorUnits } from '../src/format/money.mjs';

test('formats minor units without floating point drift', () => {
  assert.equal(formatMinorUnits(104299).replace(/ /g, ' '), '€1,042.99');
  assert.equal(formatMinorUnits(0).replace(/ /g, ' '), '€0.00');
});

test('rejects fractional minor units', () => {
  assert.throws(() => formatMinorUnits(10.5), TypeError);
  assert.throws(() => sumMinorUnits([1, 2.5]), TypeError);
});

test('sums minor units exactly', () => {
  assert.equal(sumMinorUnits([104299, 1, 700]), 105000);
  assert.equal(sumMinorUnits([]), 0);
});
