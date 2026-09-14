# Warehouse sync has been paused since July and I want a straight answer before Monday

## Problem Description

Background, because you were not here for it. `warehouse-sync` runs from crontab
every ten minutes. On 21 July two copies of it ran at the same time and
double-wrote 4,163 rows into `fact_orders`; it took two days to unpick and we
commented the job out the same afternoon. It has been off ever since - the
warehouse migration ate August and nobody came back to it.

Priya wrote `src/lock.js` and the wrapper in `src/sync.js` the week after that,
and she also handled the older failure mode: a run that got OOM-killed in May
left a lock behind that stopped the job for four days before anyone noticed.
Both paths have tests in `test/lock.test.js` and they pass. Her handover note is
in `ops/priya-note.md`; she left in August.

Analytics want the sync back on Monday morning. Everything in this repo says it
is ready to go and I would like that to be true, but the only evidence I have is
a green test file and a note from someone who has left. The run durations from
the six weeks before we paused it are in `ops/sync-runtimes.txt`, the two
incident write-ups are in `ops/`, and `ops/fleet.md` is what Ansible thinks it
has deployed.

What I need out of this is a yes or a no on Monday, with the work that answer
requires in the same change. I am not going through July again and I am not
going through May again either.

## Output Specification

1. Add `test/overlap.test.js` for the cases you decide the job has to survive
   before it goes back on. It must run under `node --test` without waiting on
   real elapsed time.
2. If `src/lock.js` or `src/sync.js` need to change, change them.
   `test/lock.test.js` must keep passing unmodified, including the crashed-run
   case.
3. Write `docs/lock-policy.md`: whether the job is safe to switch back on, what
   you changed and why, any staleness value you land on and the measurement it
   comes from, and what now happens to a run that is killed mid-flight.
4. `npm test` must be green when you are done.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "warehouse-sync",
  "version": "1.14.3",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/lock.js ===============
'use strict';

const fs = require('node:fs');

const STALE_AFTER_MS = 60 * 1000;

// Returns true if this process now owns the lock, false if another run holds it.
function acquire(lockPath) {
  try {
    fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
    return true;
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
    const ageMs = Date.now() - fs.statSync(lockPath).mtimeMs;
    if (ageMs > STALE_AFTER_MS) {
      fs.rmSync(lockPath, { force: true });
      return acquire(lockPath);
    }
    return false;
  }
}

function release(lockPath) {
  fs.rmSync(lockPath, { force: true });
}

function holderPid(lockPath) {
  return Number(fs.readFileSync(lockPath, 'utf8'));
}

module.exports = { acquire, release, holderPid, STALE_AFTER_MS };

=============== FILE: src/sync.js ===============
'use strict';

const { acquire, release } = require('./lock');

async function runSync(lockPath, work) {
  let result;
  try {
    if (!acquire(lockPath)) {
      result = { started: false, reason: 'locked' };
      return result;
    }
    result = { started: true, rows: await work() };
    return result;
  } finally {
    release(lockPath);
    if (process.env.SYNC_TRACE) console.error(`[sync] released ${lockPath}`);
  }
}

module.exports = { runSync };

=============== FILE: test/lock.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { acquire, release, holderPid } = require('../src/lock');
const { runSync } = require('../src/sync');

function lockPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wsync-')), 'sync.lock');
}

function ageLock(p, ms) {
  const when = (Date.now() - ms) / 1000;
  fs.utimesSync(p, when, when);
}

test('acquire takes a free lock and records the pid', () => {
  const p = lockPath();
  assert.equal(acquire(p), true);
  assert.equal(holderPid(p), process.pid);
});

test('a second acquire is refused while the lock is held', () => {
  const p = lockPath();
  assert.equal(acquire(p), true);
  assert.equal(acquire(p), false);
});

test('release lets the next run acquire', () => {
  const p = lockPath();
  acquire(p);
  release(p);
  assert.equal(acquire(p), true);
});

test('a lock left behind by a killed run is recovered', () => {
  const p = lockPath();
  acquire(p);
  ageLock(p, 25 * 60 * 60 * 1000);
  assert.equal(acquire(p), true);
});

test('runSync skips when another run holds the lock', async () => {
  const p = lockPath();
  acquire(p);
  const result = await runSync(p, async () => 99);
  assert.deepEqual(result, { started: false, reason: 'locked' });
});

test('runSync returns the row count from a run that starts', async () => {
  const p = lockPath();
  const result = await runSync(p, async () => 18204);
  assert.deepEqual(result, { started: true, rows: 18204 });
});

=============== FILE: ops/priya-note.md ===============
# Handover - warehouse-sync lock, priya, 2026-07-28

Both failure modes are covered.

`acquire()` creates the lock file exclusively, so a second run gets `false` back
and `runSync` exits without doing any work - that is INC-2208. A lock that is
older than `STALE_AFTER_MS` is treated as abandoned, deleted and re-taken, so a
run that is killed cannot stop the schedule the way INC-1996 did. The pid of the
holder goes into the file in case anyone needs to know who has it.

Both paths have tests in `test/lock.test.js`. As far as I am concerned this is
finished and the crontab lines can be uncommented whenever analytics want them.

=============== FILE: ops/sync-runtimes.txt ===============
# warehouse-sync wall-clock duration per run
# crontab: */10 * * * *   (every ten minutes)
# window: 2026-06-08 .. 2026-07-21, 6,312 runs recorded, 0 missed
#
# summary
#   p50   5m52s
#   p90  11m19s
#   p95  18m30s
#   p99  33m47s
#   max  41m08s   (2026-07-14T04:10Z, nightly vacuum contention)
#
# tail of the log
2026-07-20T22:30Z  ok   6m02s   18,204 rows
2026-07-20T22:40Z  ok   5m31s   17,880 rows
2026-07-20T22:50Z  ok  14m46s   52,119 rows
2026-07-21T00:00Z  ok  27m12s  104,553 rows
2026-07-21T00:10Z  ok  26m58s  104,551 rows
2026-07-21T00:20Z  ok   6m11s   18,402 rows
2026-07-21T00:30Z  ok   5m49s   17,991 rows
2026-07-21T00:40Z  ok  38m02s  147,330 rows
2026-07-21T00:50Z  ok  37m51s  147,330 rows
2026-07-21T01:00Z  ok   6m20s   18,655 rows

=============== FILE: ops/incident-2208.md ===============
# INC-2208 - duplicate rows in fact_orders

- 2026-07-21 09:40 - analytics reports order counts roughly double for the
  overnight window.
- 2026-07-21 11:05 - confirmed 4,163 rows written twice. Two `warehouse-sync`
  processes were alive at the same time for part of the night and both wrote.
  The warehouse session log for 00:40-01:20 has the two writers connected from
  10.4.2.12 and 10.4.2.15.
- 2026-07-21 14:20 - job commented out of the crontab pending a fix.
- Cause recorded as: no protection against a run starting while another one is
  still going. The job has no idempotency on write; it appends.
- Action: Priya to add a lock. Done 2026-07-28, not exercised in anger because
  the job has been off since.

=============== FILE: ops/incident-1996.md ===============
# INC-1996 - warehouse-sync stopped for four days

- 2026-05-02 - host OOM-killer took `warehouse-sync` mid-run. No exit handler
  ran.
- 2026-05-02 .. 2026-05-06 - every subsequent invocation found the leftover lock
  file and exited immediately. No alert fired; the job simply did nothing.
- 2026-05-06 - noticed when a weekly report came back empty. Lock deleted by
  hand, job resumed.
- Action: a run that is killed must not cost us more than the cycle it died in.
  Analytics can absorb one missed cycle and their hourly feed covers the rest;
  four days of silence is what we are not doing again. Whatever we put in front
  of this job has to be back to normal service by the next invocation, without
  anybody logging in.

=============== FILE: ops/fleet.md ===============
# warehouse group - hosts and the crontab they carry

Both hosts are in the `warehouse` Ansible group and take the same role. The role
was applied to the group when wh-worker-05 was added on 2026-06-02.

| Host         | Address    | Role applied | Notes                          |
|--------------|------------|--------------|--------------------------------|
| wh-worker-02 | 10.4.2.12  | 2026-04-14   | original worker                |
| wh-worker-05 | 10.4.2.15  | 2026-06-02   | added for the migration        |

The crontab the role writes, identical on both hosts, currently commented out:

    # */10 * * * * /usr/local/bin/warehouse-sync --lock /var/run/warehouse-sync.lock >> /var/log/warehouse-sync.log 2>&1

`/var/run` is tmpfs on both hosts. Nothing is mounted between them; the
warehouse database is the only thing they share.
