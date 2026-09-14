# Sign off the fix for the duplicate payout before the November clock change

## Problem Description

Incident 4471, last autumn: on Sunday 2 November the payout reconciliation
posted two identical batches an hour apart. Finance caught it on the Monday
because the ledger was out by a day's volume and we reversed the second batch by
hand. Nothing was deployed that weekend and the host was healthy.

It then sat in the backlog for ten months. Marek picked it up on 4 September
because the next clock change is 1 November and Finance will not go into it
twice. He changed the zone on both finance jobs in `src/jobs.js`, added a test
that the payout fires once on 1 November, and it is green. His note is in
`ops/change-4471.md`.

That change has not been through a clock change yet - it went in six weeks ago
and the next transition is still ahead of us - so all we have is the test he
wrote. Before I sign this off I want it verified properly rather than taken on
the strength of one green assertion, and I want the other two jobs looked at
while you are in there, because nobody has ever checked them.

The runner is `src/scheduler.js`. It walks wall-clock time in each job's own
zone and starts the job when the clock in that zone reads the hour and minute on
the job. That is the code that starts these jobs in production, so treat what it
does as what happens. It has a small test file and it passes.

Two of these jobs touch money and one files with an external partner, so a run
that goes missing matters as much as a run that happens twice. The windows
Finance works to are in `ops/finance-windows.md`.

## Output Specification

1. Add `test/transitions.test.js` covering every job in `src/jobs.js` on the
   dates where the number of runs in a local day is not one, using the helpers
   already in `src/scheduler.js`. Assert the counts and the firing instants, not
   that the job "runs".
2. Write `docs/schedule-timezones.md`: a section per job saying what its current
   configuration does through the year, whether it should be kept, and what you
   propose instead.
3. `src/jobs.js` must end up carrying whatever you propose, and your tests must
   pin the configuration you are proposing and not only the one you found.
4. Leave `src/scheduler.js` and `test/scheduler.test.js` unchanged and passing -
   the runner's behaviour is the thing under test, not the thing to fix.
   `npm test` must be green when you are done.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "ledger-scheduler",
  "version": "2.9.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/scheduler.js ===============
'use strict';

function localParts(utcMs, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const p = {};
  for (const part of fmt.formatToParts(new Date(utcMs))) {
    if (part.type !== 'literal') p[part.type] = part.value;
  }
  return {
    year: +p.year,
    month: +p.month,
    day: +p.day,
    hour: +p.hour % 24,
    minute: +p.minute,
  };
}

// Every minute, read the clock in the job's zone and start the job on a match.
function firingsBetween(job, startUtcMs, endUtcMs) {
  const out = [];
  for (let t = startUtcMs; t < endUtcMs; t += 60000) {
    const p = localParts(t, job.timeZone);
    if (p.hour === job.hour && p.minute === job.minute) out.push(new Date(t).toISOString());
  }
  return out;
}

// Firing instants (ISO, UTC) whose local calendar date in the job's zone is isoDate.
function firingsOnLocalDate(job, isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const anchor = Date.UTC(y, m - 1, d);
  return firingsBetween(job, anchor - 18 * 3600000, anchor + 30 * 3600000).filter((iso) => {
    const p = localParts(Date.parse(iso), job.timeZone);
    return p.year === y && p.month === m && p.day === d;
  });
}

module.exports = { localParts, firingsBetween, firingsOnLocalDate };

=============== FILE: src/jobs.js ===============
'use strict';

// timeZone on the two finance jobs was changed on 2026-09-04, see ops/change-4471.md.
module.exports = [
  {
    name: 'payout-reconcile',
    hour: 1,
    minute: 30,
    timeZone: 'EST',
    owner: 'finance-eng',
    note: 'posts the settlement batch for the previous day; appends, no key on the batch',
  },
  {
    name: 'ledger-close',
    hour: 2,
    minute: 15,
    timeZone: 'Etc/GMT+5',
    owner: 'finance-eng',
    note: 'freezes the books for the previous day; downstream reports read the frozen copy',
  },
  {
    name: 'eu-vat-export',
    hour: 3,
    minute: 0,
    timeZone: 'Europe/Berlin',
    owner: 'tax',
    note: 'uploads the daily VAT file to the filing partner',
  },
  {
    name: 'metrics-rollup',
    hour: 6,
    minute: 0,
    timeZone: 'UTC',
    owner: 'platform',
    note: 'aggregates yesterday into the warehouse',
  },
];

=============== FILE: test/scheduler.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { localParts, firingsOnLocalDate } = require('../src/scheduler');
const jobs = require('../src/jobs');

const byName = (n) => jobs.find((j) => j.name === n);

test('localParts converts into the job zone', () => {
  const p = localParts(Date.UTC(2026, 5, 10, 5, 30), 'America/New_York');
  assert.deepEqual(p, { year: 2026, month: 6, day: 10, hour: 1, minute: 30 });
});

test('each job runs once on an ordinary day', () => {
  for (const job of jobs) {
    assert.equal(firingsOnLocalDate(job, '2026-06-10').length, 1, job.name);
  }
});

// Added 2026-09-04 with the change in ops/change-4471.md.
test('payout-reconcile runs once on the November clock change', () => {
  assert.equal(firingsOnLocalDate(byName('payout-reconcile'), '2026-11-01').length, 1);
});

=============== FILE: ops/incident-4471.md ===============
# INC-4471 - payout posted twice

- 2025-11-02 05:30 UTC - `payout-reconcile` ran and posted batch 88214.
- 2025-11-02 06:30 UTC - `payout-reconcile` ran again and posted an identical
  batch, 88215. The ledger took both; nothing in the batch is keyed on the
  period it covers.
- 2025-11-03 - Finance reconciled and found the day out by one day's volume.
  Batch 88215 reversed by hand, 4h of two people's time.
- No deploy that weekend. Config unchanged since March 2025. Host metrics for
  the whole night are normal; both runs completed cleanly.
- Nothing was recorded about the other three jobs. Nobody looked at them.

=============== FILE: ops/change-4471.md ===============
# Change note 2026-09-04 - marek

Picked up INC-4471 ahead of the 1 November clock change.

Before this change both finance jobs carried:

    payout-reconcile   hour 1  minute 30   timeZone America/New_York
    ledger-close       hour 2  minute 15   timeZone America/New_York

After:

    payout-reconcile   hour 1  minute 30   timeZone EST
    ledger-close       hour 2  minute 15   timeZone Etc/GMT+5

Rationale: the ledger runs on New York time and New York is five hours behind
UTC, so I pinned both jobs to that instead of leaving them on a zone that shifts
underneath us. Added `payout-reconcile runs once on the November clock change`
to `test/scheduler.test.js`; it passes, so the duplicate cannot happen again.

Not touched: eu-vat-export, metrics-rollup.

=============== FILE: ops/finance-windows.md ===============
# Windows the finance jobs have to fit inside

All times below are wall-clock America/New_York, because that is what the
controllers and the external reconciliation window work to.

- The settlement batch must be posted before 02:00, when the reconciliation
  window with the banking partner opens. A batch that arrives after 02:00 is
  carried into the next day's window and shows up as a late posting on the
  partner's statement; we have had two.
- The books must be frozen after the settlement batch is posted and before
  06:00, when the daily report build reads the frozen copy. A report build that
  runs against books that were never frozen produces numbers that do not tie out,
  and nothing in the build notices.
- The accounting day these jobs close is the previous calendar day in
  America/New_York.
