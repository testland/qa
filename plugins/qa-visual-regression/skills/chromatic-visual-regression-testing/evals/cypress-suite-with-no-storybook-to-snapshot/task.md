# The rebrand lands in three weeks and 47 green specs will not notice

## Problem Description

`ledger-console` is our customer-facing app: 47 Cypress specs, all green, about
six minutes on every PR. In three weeks we replace the colour palette, the type
scale and the button shapes. The specs assert on roles and text, so they will
stay green through all of that and we will hear about the damage from customers.

`docs/rebrand-screens.md` is the list of screens that must not break. Two people
have already had a go at covering them and both attempts are sitting on the same
spike branch.

Jo built what is in `cypress/support/visual.mjs`: `cy.screenshot()` added to the
six specs, PNG baselines committed under `cypress/baselines/`, and a `pixelmatch`
comparison registered as a `cy.task`. It is sixty lines, it has its own unit
tests, and it has been running on `spike/visual-jo` for eight days - roughly 40
CI runs. Jo reads the record as the app being visually stable and is fairly
insistent that we just merge it. Jo also leaves in November, so if we are
inheriting this I would like to know that now.

Ash started wiring up the hosted service instead - we already pay for it on the
design-system repo, seats are spare, a project has been created for this repo and
the token is in this repo's secrets as `CHROMATIC_PROJECT_TOKEN`. Ash got as far
as a step on the same spike branch and then moved to the design-system repo full
time. `logs/spike-visual-runs.txt` is what that step printed on its last three
runs. Nobody has looked at it since.

Constraints, so you are not guessing at them. The 47 specs have to keep passing
and I am not paying for them to be rewritten. The e2e job is already the long
pole in the pipeline at six minutes and I am not doubling it. And whatever you
pick has to be running against pull requests into `main` well before the rebrand
merges, not sketched out as a project for next quarter.

Give me the shortest route to having those screens compared on every PR, and a
straight answer on each of the two attempts that I can forward to the person who
wrote it.

## Output Specification

1. Wire the per-PR comparison into `.github/workflows/e2e.yml`, with whatever
   `package.json` and `cypress.config.js` changes that needs.
2. Leave the repo consistent with whatever you decide about Jo's comparison.
   `npm test` (`node --test`) must pass when you are finished.
3. Write `docs/visual-coverage-plan.md`: the coverage the first pass delivers,
   screen by screen, and a direct answer on each of the two attempts.

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

All six routes except `/login` and `/error/500` are behind the session that
`cy.login()` establishes.

=============== FILE: cypress/support/visual.mjs ===============
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function shouldSeedBaseline(baselinePath) {
  return !existsSync(baselinePath);
}

export function compareOrSeed(baselineDir, name, actualBytes, diffFn) {
  const baselinePath = join(baselineDir, `${name}.png`);
  if (shouldSeedBaseline(baselinePath)) {
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
  assert.equal(shouldSeedBaseline(join(fixtureDir(), 'login.png')), true);
});

test('compares when a baseline is already present', () => {
  const dir = fixtureDir();
  writeFileSync(join(dir, 'login.png'), Buffer.from('baseline'));
  assert.equal(shouldSeedBaseline(join(dir, 'login.png')), false);
});

test('reports a match when the captured bytes are identical', () => {
  const dir = fixtureDir();
  writeFileSync(join(dir, 'login.png'), Buffer.from('baseline'));
  const out = compareOrSeed(dir, 'login', Buffer.from('baseline'), () => 0);
  assert.equal(out.status, 'match');
});

test('reports a difference when the captured bytes differ', () => {
  const dir = fixtureDir();
  writeFileSync(join(dir, 'login.png'), Buffer.from('baseline'));
  const out = compareOrSeed(dir, 'login', Buffer.from('actual'), () => 812);
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

=============== FILE: cypress/e2e/login.cy.js ===============
describe('login', () => {
  it('renders the sign-in form', () => {
    cy.visit('/login');
    cy.findByRole('heading', { name: 'Sign in' }).should('be.visible');
    cy.findByLabelText('Work email').should('be.enabled');
    cy.findByRole('button', { name: 'Continue' }).should('be.enabled');
    cy.screenshot('login', { capture: 'viewport' });
    cy.readFile('cypress/screenshots/login.cy.js/login.png', 'base64').then((image) => {
      cy.task('visual:compare', { name: 'login', image });
    });
  });

  it('rejects an unknown address', () => {
    cy.visit('/login');
    cy.findByLabelText('Work email').type('nobody@example.com');
    cy.findByRole('button', { name: 'Continue' }).click();
    cy.findByRole('alert').should('contain.text', 'We do not recognise that address');
  });
});

=============== FILE: cypress/e2e/invoice.cy.js ===============
describe('invoice detail', () => {
  beforeEach(() => {
    cy.task('db:seed', 'invoice-fixture');
    cy.login('finance-lead@acme.test');
  });

  it('renders the invoice header and totals', () => {
    cy.visit('/invoices/INV-1042');
    cy.findByRole('heading', { name: 'INV-1042' }).should('be.visible');
    cy.findByTestId('invoice-total').should('have.text', '€1,042.99');
    cy.screenshot('invoice', { capture: 'viewport' });
    cy.readFile('cypress/screenshots/invoice.cy.js/invoice.png', 'base64').then((image) => {
      cy.task('visual:compare', { name: 'invoice', image });
    });
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
    cy.readFile('cypress/screenshots/dashboard.cy.js/dashboard.png', 'base64').then((image) => {
      cy.task('visual:compare', { name: 'dashboard', image });
    });
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

      - name: Hosted visual (Ash, spike branch only)
        if: github.ref == 'refs/heads/spike/visual-jo'
        run: npx chromatic --playwright --exit-zero-on-changes
        env:
          CHROMATIC_PROJECT_TOKEN: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}

=============== FILE: logs/spike-visual-runs.txt ===============
spike/visual-jo - "Hosted visual (Ash, spike branch only)" step, last three runs

--- run 4181  2026-09-04 ---
$ npx chromatic --playwright --exit-zero-on-changes
  Authenticated with project ledger-console
  Publishing...
  Published build 5
  Build 5 contains 0 snapshots
  Build 5 passed
  exit 0

--- run 4186  2026-09-06 ---
$ npx chromatic --playwright --exit-zero-on-changes
  Authenticated with project ledger-console
  Publishing...
  Published build 6
  Build 6 contains 0 snapshots
  Build 6 passed
  exit 0

--- run 4191  2026-09-09 ---
$ npx chromatic --playwright --exit-zero-on-changes
  Authenticated with project ledger-console
  Publishing...
  Published build 7
  Build 7 contains 0 snapshots
  Build 7 passed
  exit 0

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
    "test": "node --test"
  },
  "devDependencies": {
    "chromatic": "11.10.2",
    "cypress": "13.15.0",
    "pixelmatch": "6.0.0",
    "pngjs": "7.0.0",
    "vite": "5.4.8"
  }
}

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
