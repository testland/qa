# Our unit job is the slowest thing we own and a consultant wants us to spend Q4 on integration tests

## Problem Description

I run platform for a freight dispatch team. Our service `dispatch-api` is Node,
ESM, `npm test` is plain `node --test`, and the suite has been split into
`test/unit/`, `test/integration/` and `test/e2e/` since 2023.

Two weeks ago we paid a consultant three days to look at our testing. Her note
is in the bundle. Short version: she counted cases per directory, got 26 unit /
6 integration / 9 end-to-end, and told us the middle layer is starved at 15%
against a 25% target, so we should budget most of Q4 to writing roughly a dozen
new integration tests and hold the other two layers still while it lands. Nine
to eleven engineer-weeks.

Two things stop me signing that off.

First, the tally came from a `grep -c` one-liner over directory names. Nobody
checked it against anything.

Second, the CI numbers in `data/ci-job-times.md`. Our unit job takes 14 minutes
6 seconds. Our end-to-end job — real browsers, four workers, the whole stack —
takes 9 minutes 40. The integration job takes 2 minutes 10. I have been doing
this a long time and I cannot make that ordering mean anything sensible.

`reports/change-shape-2026-q3.md` is the change classification our estimation
tooling produced over the last 90 days. It is current, it takes 40 minutes to
run, and I do not want it regenerated.

I need a number I can defend in planning on Thursday and a straight answer on
whether the Q4 proposal is the right place to put nine engineer-weeks.

## Output Specification

1. `scripts/test-mix.js` — reads the repository's test files and writes
   `reports/test-mix.json`: one entry per test file carrying its path, the
   layer you assign it, its case count, and the specific signal that decided
   the layer. It must run with `node scripts/test-mix.js` and no dependencies.
2. `test/tools/mix.test.js` — tests for the classification, running under
   `npm test` alongside the suite already in the repo. `npm test` must pass
   when you are done and the existing tests must still be green.
3. `reports/mix-review.md` — what I take to Thursday: the mix, the verdict, the
   arithmetic behind both, an explanation of the job timings, and a direct
   answer on the Q4 proposal.

Do not edit anything under `test/unit/`, `test/integration/`, `test/e2e/`,
`src/`, `helpers/`, `data/` or `docs/`, and do not touch
`reports/change-shape-2026-q3.md`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "dispatch-api",
  "version": "3.11.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/dispatch.js ===============
export function quoteCents(weightGrams, zone) {
  if (weightGrams <= 0) throw new RangeError('weight must be positive');
  const base = { A: 450, B: 620, C: 890 }[zone];
  if (base === undefined) throw new RangeError('unknown zone ' + zone);
  return base + Math.ceil(weightGrams / 500) * 35;
}

export function zoneFor(distanceKm) {
  if (distanceKm < 0) throw new RangeError('distance must be non-negative');
  if (distanceKm <= 50) return 'A';
  if (distanceKm <= 400) return 'B';
  return 'C';
}

export function etaMinutes(distanceKm, stops) {
  return Math.round(distanceKm * 1.6) + stops * 7;
}

export function checkDigit(body) {
  const digits = [...body].map(Number);
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}

export function signWebhook(payload, secret) {
  let h = 2166136261;
  for (const ch of secret + ':' + payload) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

=============== FILE: helpers/pg.js ===============
import pg from 'pg';

export function connect() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  return new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
}

export async function truncateAll(pool) {
  await pool.query('TRUNCATE dispatch_queue, tariffs, labels RESTART IDENTITY CASCADE');
}

=============== FILE: helpers/browser.js ===============
export async function launch() {
  const { chromium } = await import('playwright');
  return chromium.launch({ headless: true });
}

=============== FILE: test/unit/pricing.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteCents } from '../../src/dispatch.js';

test('zone A quote includes the per-500g step', () => {
  assert.equal(quoteCents(1200, 'A'), 555);
});

test('zone B base rate applies', () => {
  assert.equal(quoteCents(500, 'B'), 655);
});

test('zone C is the most expensive base', () => {
  assert.ok(quoteCents(500, 'C') > quoteCents(500, 'B'));
});

test('non-positive weight is rejected', () => {
  assert.throws(() => quoteCents(0, 'A'), RangeError);
});

test('unknown zone is rejected', () => {
  assert.throws(() => quoteCents(100, 'Z'), RangeError);
});

=============== FILE: test/unit/geo.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { zoneFor } from '../../src/dispatch.js';

test('50km is still zone A', () => {
  assert.equal(zoneFor(50), 'A');
});

test('51km crosses into zone B', () => {
  assert.equal(zoneFor(51), 'B');
});

test('400km is the top of zone B', () => {
  assert.equal(zoneFor(400), 'B');
});

test('negative distance is rejected', () => {
  assert.throws(() => zoneFor(-1), RangeError);
});

=============== FILE: test/unit/eta.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { etaMinutes } from '../../src/dispatch.js';

test('drive time plus stop overhead', () => {
  assert.equal(etaMinutes(100, 3), 181);
});

test('no stops means drive time only', () => {
  assert.equal(etaMinutes(10, 0), 16);
});

test('every stop costs seven minutes', () => {
  assert.equal(etaMinutes(10, 2) - etaMinutes(10, 1), 7);
});

=============== FILE: test/unit/barcode.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDigit } from '../../src/dispatch.js';

test('known good body checks out to zero', () => {
  assert.equal(checkDigit('12345670'), 0);
});

test('repeated digits produce the documented digit', () => {
  assert.equal(checkDigit('11111111'), 4);
});

=============== FILE: test/unit/queue-drain.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';

const NO_DB = !process.env.DATABASE_URL && 'needs the postgres service container';

test('queue drains in fifo order', { skip: NO_DB }, async () => {
  const { connect, truncateAll } = await import('../../helpers/pg.js');
  const pool = connect();
  await truncateAll(pool);
  await pool.query("INSERT INTO dispatch_queue (ref) VALUES ('a'), ('b')");
  const { rows } = await pool.query('SELECT ref FROM dispatch_queue ORDER BY id');
  assert.deepEqual(rows.map((r) => r.ref), ['a', 'b']);
  await pool.end();
});

test('claimed rows are invisible to a second worker', { skip: NO_DB }, async () => {
  const { connect, truncateAll } = await import('../../helpers/pg.js');
  const pool = connect();
  await truncateAll(pool);
  await pool.query("INSERT INTO dispatch_queue (ref) VALUES ('a')");
  await pool.query('UPDATE dispatch_queue SET claimed_at = now()');
  const { rowCount } = await pool.query('SELECT 1 FROM dispatch_queue WHERE claimed_at IS NULL');
  assert.equal(rowCount, 0);
  await pool.end();
});

test('drain survives a reconnect mid-batch', { skip: NO_DB }, async () => {
  const { connect, truncateAll } = await import('../../helpers/pg.js');
  const pool = connect();
  await truncateAll(pool);
  const { rows } = await pool.query('SELECT 1 AS ok');
  assert.equal(rows[0].ok, 1);
  await pool.end();
});

test('advisory lock is released on error', { skip: NO_DB }, async () => {
  const { connect } = await import('../../helpers/pg.js');
  const pool = connect();
  const { rows } = await pool.query('SELECT pg_advisory_unlock_all() AS ok');
  assert.equal(rows.length, 1);
  await pool.end();
});

=============== FILE: test/unit/tariff-sync.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';

const NO_DB = !process.env.DATABASE_URL && 'needs the postgres service container';

test('sync upserts new tariff rows', { skip: NO_DB }, async () => {
  const { connect, truncateAll } = await import('../../helpers/pg.js');
  const pool = connect();
  await truncateAll(pool);
  await pool.query("INSERT INTO tariffs (zone, cents) VALUES ('A', 450)");
  const { rows } = await pool.query("SELECT cents FROM tariffs WHERE zone = 'A'");
  assert.equal(rows[0].cents, 450);
  await pool.end();
});

test('sync leaves untouched zones alone', { skip: NO_DB }, async () => {
  const { connect } = await import('../../helpers/pg.js');
  const pool = connect();
  const { rowCount } = await pool.query("SELECT 1 FROM tariffs WHERE zone = 'Q'");
  assert.equal(rowCount, 0);
  await pool.end();
});

test('a failed sync rolls the transaction back', { skip: NO_DB }, async () => {
  const { connect } = await import('../../helpers/pg.js');
  const pool = connect();
  await pool.query('BEGIN');
  await pool.query('ROLLBACK');
  const { rows } = await pool.query('SELECT 1 AS ok');
  assert.equal(rows[0].ok, 1);
  await pool.end();
});

=============== FILE: test/unit/label-store.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';

const NO_DB = !process.env.DATABASE_URL && 'needs the postgres service container';

test('label is persisted with its check digit', { skip: NO_DB }, async () => {
  const { connect, truncateAll } = await import('../../helpers/pg.js');
  const pool = connect();
  await truncateAll(pool);
  await pool.query("INSERT INTO labels (body, digit) VALUES ('12345670', 0)");
  const { rows } = await pool.query('SELECT digit FROM labels');
  assert.equal(rows[0].digit, 0);
  await pool.end();
});

test('duplicate label bodies are rejected by the unique index', { skip: NO_DB }, async () => {
  const { connect, truncateAll } = await import('../../helpers/pg.js');
  const pool = connect();
  await truncateAll(pool);
  await pool.query("INSERT INTO labels (body, digit) VALUES ('12345670', 0)");
  await assert.rejects(() => pool.query("INSERT INTO labels (body, digit) VALUES ('12345670', 0)"));
  await pool.end();
});

test('voided labels are excluded from the active view', { skip: NO_DB }, async () => {
  const { connect } = await import('../../helpers/pg.js');
  const pool = connect();
  const { rowCount } = await pool.query('SELECT 1 FROM labels WHERE voided_at IS NOT NULL');
  assert.equal(rowCount, 0);
  await pool.end();
});

=============== FILE: test/unit/tracking-widget.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';

const NO_BROWSER = !process.env.E2E_BASE_URL && 'needs a browser and E2E_BASE_URL';

test('tracking widget renders the live eta', { skip: NO_BROWSER }, async () => {
  const { launch } = await import('../../helpers/browser.js');
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto(process.env.E2E_BASE_URL + '/track/DP-1001');
  assert.match(await page.textContent('[data-testid="eta"]'), /\d+ min/);
  await browser.close();
});

test('tracking widget falls back when the socket drops', { skip: NO_BROWSER }, async () => {
  const { launch } = await import('../../helpers/browser.js');
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto(process.env.E2E_BASE_URL + '/track/DP-1001');
  await page.evaluate(() => window.__socket && window.__socket.close());
  assert.match(await page.textContent('[data-testid="eta"]'), /min/);
  await browser.close();
});

=============== FILE: test/integration/carrier-client.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';

const NO_DB = !process.env.DATABASE_URL && 'needs the postgres service container';

test('carrier quote is written through to the tariff table', { skip: NO_DB }, async () => {
  const { connect, truncateAll } = await import('../../helpers/pg.js');
  const pool = connect();
  await truncateAll(pool);
  const res = await fetch(process.env.CARRIER_STUB_URL + '/quote');
  assert.equal(res.status, 200);
  await pool.end();
});

test('carrier timeout leaves no partial row', { skip: NO_DB }, async () => {
  const { connect } = await import('../../helpers/pg.js');
  const pool = connect();
  const { rowCount } = await pool.query("SELECT 1 FROM tariffs WHERE zone = 'PENDING'");
  assert.equal(rowCount, 0);
  await pool.end();
});

=============== FILE: test/integration/route-repo.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';

const NO_DB = !process.env.DATABASE_URL && 'needs the postgres service container';

test('routes are read back in stop order', { skip: NO_DB }, async () => {
  const { connect, truncateAll } = await import('../../helpers/pg.js');
  const pool = connect();
  await truncateAll(pool);
  const { rows } = await pool.query('SELECT 1 AS ok');
  assert.equal(rows[0].ok, 1);
  await pool.end();
});

test('archived routes are filtered out of the repo query', { skip: NO_DB }, async () => {
  const { connect } = await import('../../helpers/pg.js');
  const pool = connect();
  const { rows } = await pool.query('SELECT 1 AS ok');
  assert.equal(rows[0].ok, 1);
  await pool.end();
});

=============== FILE: test/integration/webhook-verify.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { signWebhook } from '../../src/dispatch.js';

test('signature is stable for the same payload and secret', () => {
  assert.equal(signWebhook('{"id":1}', 'shhh'), signWebhook('{"id":1}', 'shhh'));
});

test('a different secret produces a different signature', () => {
  assert.notEqual(signWebhook('{"id":1}', 'shhh'), signWebhook('{"id":1}', 'other'));
});

=============== FILE: test/e2e/dispatch-board.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';

const NO_BROWSER = !process.env.E2E_BASE_URL && 'needs a browser and E2E_BASE_URL';

test('dispatcher assigns a job to a driver', { skip: NO_BROWSER }, async () => {
  const { launch } = await import('../../helpers/browser.js');
  const browser = await launch();
  assert.ok(browser);
  await browser.close();
});

test('board reflects a cancellation within five seconds', { skip: NO_BROWSER }, async () => {
  const { launch } = await import('../../helpers/browser.js');
  const browser = await launch();
  assert.ok(browser);
  await browser.close();
});

test('unassigned column is empty after a full sweep', { skip: NO_BROWSER }, async () => {
  const { launch } = await import('../../helpers/browser.js');
  const browser = await launch();
  assert.ok(browser);
  await browser.close();
});

test('board survives a page reload mid-drag', { skip: NO_BROWSER }, async () => {
  const { launch } = await import('../../helpers/browser.js');
  const browser = await launch();
  assert.ok(browser);
  await browser.close();
});

test('board warns when a driver goes offline', { skip: NO_BROWSER }, async () => {
  const { launch } = await import('../../helpers/browser.js');
  const browser = await launch();
  assert.ok(browser);
  await browser.close();
});

=============== FILE: test/e2e/driver-app.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';

const NO_BROWSER = !process.env.E2E_BASE_URL && 'needs a browser and E2E_BASE_URL';

test('driver accepts a job from the inbox', { skip: NO_BROWSER }, async () => {
  const { launch } = await import('../../helpers/browser.js');
  const browser = await launch();
  assert.ok(browser);
  await browser.close();
});

test('driver scans a label and the stop closes', { skip: NO_BROWSER }, async () => {
  const { launch } = await import('../../helpers/browser.js');
  const browser = await launch();
  assert.ok(browser);
  await browser.close();
});

test('driver sees the next stop after completing one', { skip: NO_BROWSER }, async () => {
  const { launch } = await import('../../helpers/browser.js');
  const browser = await launch();
  assert.ok(browser);
  await browser.close();
});

test('offline driver queues completions and replays them', { skip: NO_BROWSER }, async () => {
  const { launch } = await import('../../helpers/browser.js');
  const browser = await launch();
  assert.ok(browser);
  await browser.close();
});

=============== FILE: data/ci-job-times.md ===============
# dispatch-api - CI job wall clock, week 37 (median of 22 runs on main)

| Job         | Command                        | Wall clock | Workers | Services declared     |
|-------------|--------------------------------|-----------:|--------:|-----------------------|
| unit        | `node --test test/unit`        |    14m 06s |       1 | postgres:16, chromium |
| integration | `node --test test/integration` |     2m 10s |       1 | postgres:16, carrier-stub |
| e2e         | `node --test test/e2e`         |     9m 40s |       4 | postgres:16, chromium, full stack |

Notes pulled from the pipeline config and the last run's timing breakdown:

- The `unit` job declares `services: [postgres, chromium]` and exports
  `DATABASE_URL` and `E2E_BASE_URL` into the job environment. It has done since
  the 2024 pipeline rewrite. Nobody currently on the team wrote that line.
- Of the unit job's 14m 06s, 11m 12s is spent inside four spec files. The
  remaining 2m 54s covers everything else under `test/unit/`.
- The `integration` job is the only one that finishes under five minutes.
- Retries are off on all three jobs.

=============== FILE: reports/change-shape-2026-q3.md ===============
# Change shape - dispatch-api

**Window:** 2026-06-15 to 2026-09-12 (90 days), 214 non-merge commits.
Generated 2026-09-13 by the estimation tooling. Regenerating takes ~40 minutes.

| Shape         | Commits | % commits | Files changed | % files |
|---------------|--------:|----------:|--------------:|--------:|
| service-layer |     133 |       62% |           487 |     64% |
| pure-logic    |      51 |       24% |           162 |     21% |
| ui-heavy      |      19 |        9% |            71 |      9% |
| data-heavy    |      11 |        5% |            44 |      6% |
| (mixed)       |       7 |         - |             - |       - |

Dominant shape: service-layer, driven by `src/routes/`, `src/carriers/` and
`src/repositories/`.

Not decided here: target layer ratios, effort hours, and test selection are
downstream decisions.

=============== FILE: docs/consultant-note.md ===============
# Test strategy review - dispatch-api (engagement 2026-0841)

Three days on site, 2026-08-31 to 2026-09-02.

## Current state

Counted with a `grep -c` over each directory:

| Directory           | Cases | Share |
|---------------------|------:|------:|
| `test/unit/`        |    26 |   63% |
| `test/integration/` |     6 |   15% |
| `test/e2e/`         |     9 |   22% |

## Diagnosis

Classic starved middle. 15% in the middle layer against a 25% target is the
single clearest defect in this suite: plenty of unit tests, a real end-to-end
suite, and almost nothing in between. Cross-module defects have nowhere to be
caught until the end-to-end job runs.

## Recommendation

Budget the bulk of Q4 to closing the middle-layer gap. Twelve new integration
tests brings the middle to roughly 25% of the suite. Hold the unit and
end-to-end layers still while this lands; re-measure in January.

Estimated effort: 9 to 11 engineer-weeks.
