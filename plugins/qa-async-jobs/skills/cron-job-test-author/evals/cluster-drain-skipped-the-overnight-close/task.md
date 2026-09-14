# Platform wants one scheduling policy signed off for all three workloads

## Problem Description

On 1 September the platform team drained a node pool for a patch upgrade between
01:40 and 02:05 UTC. The monthly `close-books` run never happened. No alert, no
failed Job object, nothing in the dashboard - the controller simply did not
create the Job, and we found out on the 10th when Accounting asked where the
August close was. The manifests have not been touched since March.

Out of that, platform has drafted one scheduling standard to apply to every
CronJob in the cluster. It is in `ops/proposed-policy.md` and they want it signed
off so they can raise a single PR against all three manifests. The reasoning in
it is not silly and the person who wrote it has been carrying this incident for a
fortnight.

I am not signing something off because it reads as safer than what we have now.
Go through the draft properly, decide what you would actually apply and to which
workload, and change only what you can defend to the team that owns the job.

The three objects as they are in the cluster are in `k8s/`, platform's model of
the controller is `src/controller.js` and it has a test file that passes, the
cluster's own notes are in `ops/cluster.md` - including the requirement each
owning team gave us, which is the closest thing we have to a spec - and the two
incident write-ups are in `ops/` as well.

## Output Specification

1. Edit the objects under `k8s/` to whatever you sign off on, and leave every
   field you are not acting on exactly as it is.
2. Add `test/policy.test.js`, driving `src/controller.js`, for what each object
   does under the configuration you are proposing. Exercise what you propose,
   not only what is there today. Leave `src/controller.js` and
   `test/controller.test.js` unchanged and passing; `npm test` must be green.
3. Write `docs/scheduling-review.md`. Answer the draft point by point: for each
   of its three proposals, whether it should apply to each workload, and why.
   Then, per workload: what should happen when a scheduled run is missed, what
   should happen when a run is still going when the next one is due, which field
   on the object implements each decision, and the value you set.
4. In the same document, say what would have made the September miss visible
   inside a day rather than in nine, given what the cluster already alerts on.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "prod-us-east-scheduling",
  "version": "1.3.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/controller.js ===============
'use strict';

// Model of the CronJob controller running on prod-us-east. Platform keeps it in
// step with the controller's own behaviour; scheduling changes are signed off
// against it before they go near a manifest.

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
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour % 24, minute: +p.minute };
}

function fieldMatches(field, value, lo, hi) {
  for (const part of String(field).split(',')) {
    const [range, stepRaw] = part.split('/');
    const step = stepRaw === undefined ? 1 : Number(stepRaw);
    let from;
    let to;
    if (range === '*') {
      from = lo;
      to = hi;
    } else if (range.includes('-')) {
      const [a, b] = range.split('-');
      from = Number(a);
      to = Number(b);
    } else {
      from = Number(range);
      to = from;
    }
    for (let v = from; v <= to; v += step) if (v === value) return true;
  }
  return false;
}

// A schedule with no .spec.timeZone on the object is read in UTC.
function firesAt(spec, utcMs) {
  const [minute, hour, dom, month, dow] = String(spec.schedule).trim().split(/\s+/);
  const p = localParts(utcMs, spec.timeZone || 'UTC');
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return (
    fieldMatches(minute, p.minute, 0, 59) &&
    fieldMatches(hour, p.hour, 0, 23) &&
    fieldMatches(dom, p.day, 1, 31) &&
    fieldMatches(month, p.month, 1, 12) &&
    fieldMatches(dow, weekday, 0, 6)
  );
}

// simulate(cronJob, { fromMs, toMs, durationMs, unavailable, status })
//   durationMs   how long a Job of this workload takes; a number or slot => ms
//   unavailable  [{ fromMs, toMs }] windows where the controller creates nothing
// Returns the controller's events, the object's status at the end, and anything
// still running. Event types: JobCreated, JobCompleted, JobTerminated,
// ScheduleMissed.
function simulate(cronJob, opts) {
  const spec = cronJob.spec;
  const policy = spec.concurrencyPolicy || 'Allow';
  const deadlineMs = spec.startingDeadlineSeconds == null ? null : spec.startingDeadlineSeconds * 1000;
  const durationOf = typeof opts.durationMs === 'function' ? opts.durationMs : () => opts.durationMs;
  const down = (t) => (opts.unavailable || []).some((w) => t >= w.fromMs && t < w.toMs);

  const status = Object.assign({ lastScheduleTime: null, lastSuccessfulTime: null }, opts.status);
  const events = [];
  const pending = [];
  let running = [];

  for (let t = opts.fromMs; t < opts.toMs; t += 60000) {
    for (const job of running) {
      if (job.finishesAt <= t) {
        events.push({ at: job.finishesAt, type: 'JobCompleted', forSlot: job.slot });
        status.lastSuccessfulTime = job.finishesAt;
      }
    }
    running = running.filter((job) => job.finishesAt > t);

    if (firesAt(spec, t)) pending.push(t);
    if (down(t)) continue;

    while (pending.length) {
      const slot = pending[0];
      if (deadlineMs !== null && t - slot > deadlineMs) {
        pending.shift();
        events.push({ at: t, type: 'ScheduleMissed', forSlot: slot });
        continue;
      }
      if (running.length && policy === 'Forbid') break;
      if (running.length && policy === 'Replace') {
        for (const job of running) {
          events.push({ at: t, type: 'JobTerminated', forSlot: job.slot, ranForMs: t - job.startedAt });
        }
        running = [];
      }
      pending.shift();
      running.push({ slot, startedAt: t, finishesAt: t + durationOf(slot) });
      status.lastScheduleTime = slot;
      events.push({ at: t, type: 'JobCreated', forSlot: slot });
    }
  }

  return { events, status, stillRunning: running };
}

module.exports = { simulate, firesAt, localParts };

=============== FILE: k8s/close-books.json ===============
{
  "apiVersion": "batch/v1",
  "kind": "CronJob",
  "metadata": {
    "name": "close-books",
    "namespace": "finance",
    "labels": { "owner": "finance-eng" }
  },
  "spec": {
    "schedule": "0 2 1 * *",
    "startingDeadlineSeconds": 120,
    "successfulJobsHistoryLimit": 3,
    "failedJobsHistoryLimit": 3,
    "jobTemplate": {
      "spec": {
        "backoffLimit": 2,
        "template": {
          "spec": {
            "restartPolicy": "Never",
            "containers": [
              {
                "name": "close",
                "image": "registry.internal/finance/close-books:2026.08.3",
                "args": ["--period", "previous-month"],
                "resources": { "requests": { "cpu": "2", "memory": "6Gi" } }
              }
            ]
          }
        }
      }
    }
  }
}

=============== FILE: k8s/promo-blast.json ===============
{
  "apiVersion": "batch/v1",
  "kind": "CronJob",
  "metadata": {
    "name": "promo-blast",
    "namespace": "growth",
    "labels": { "owner": "growth-eng" }
  },
  "spec": {
    "schedule": "30 9 * * 2",
    "timeZone": "America/Chicago",
    "concurrencyPolicy": "Forbid",
    "startingDeadlineSeconds": 300,
    "successfulJobsHistoryLimit": 5,
    "failedJobsHistoryLimit": 5,
    "jobTemplate": {
      "spec": {
        "backoffLimit": 0,
        "template": {
          "spec": {
            "restartPolicy": "Never",
            "containers": [
              {
                "name": "blast",
                "image": "registry.internal/growth/promo-blast:2026.07.9",
                "args": ["--segment", "weekly-active"],
                "resources": { "requests": { "cpu": "1", "memory": "2Gi" } }
              }
            ]
          }
        }
      }
    }
  }
}

=============== FILE: k8s/warehouse-compact.json ===============
{
  "apiVersion": "batch/v1",
  "kind": "CronJob",
  "metadata": {
    "name": "warehouse-compact",
    "namespace": "platform",
    "labels": { "owner": "platform" }
  },
  "spec": {
    "schedule": "0 * * * *",
    "startingDeadlineSeconds": 900,
    "successfulJobsHistoryLimit": 3,
    "failedJobsHistoryLimit": 3,
    "jobTemplate": {
      "spec": {
        "backoffLimit": 1,
        "template": {
          "spec": {
            "restartPolicy": "Never",
            "containers": [
              {
                "name": "compact",
                "image": "registry.internal/platform/warehouse-compact:2026.08.1",
                "args": ["--partitions", "orders,events"],
                "resources": { "requests": { "cpu": "4", "memory": "16Gi" } }
              }
            ]
          }
        }
      }
    }
  }
}

=============== FILE: test/controller.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { simulate, firesAt } = require('../src/controller');

const MIN = 60000;
const HOUR = 60 * MIN;
const at = (y, m, d, h = 0, mi = 0) => Date.UTC(y, m - 1, d, h, mi);
const cj = (spec) => ({ apiVersion: 'batch/v1', kind: 'CronJob', metadata: { name: 'example' }, spec });
const typeCount = (events, type) => events.filter((e) => e.type === type).length;

test('an hourly schedule creates one Job an hour', () => {
  const r = simulate(cj({ schedule: '0 * * * *' }), {
    fromMs: at(2026, 6, 10, 0, 0),
    toMs: at(2026, 6, 10, 6, 0),
    durationMs: 5 * MIN,
  });
  assert.equal(typeCount(r.events, 'JobCreated'), 6);
  assert.equal(typeCount(r.events, 'JobCompleted'), 6);
});

test('a schedule is read in the zone named on the object', () => {
  const spec = { schedule: '0 9 * * *', timeZone: 'Europe/Berlin' };
  assert.equal(firesAt(spec, at(2026, 6, 10, 7, 0)), true);
  assert.equal(firesAt(spec, at(2026, 6, 10, 9, 0)), false);
});

test('a run that is still going blocks the next slot under Forbid', () => {
  const r = simulate(cj({ schedule: '0 * * * *', concurrencyPolicy: 'Forbid', startingDeadlineSeconds: 300 }), {
    fromMs: at(2026, 6, 10, 0, 0),
    toMs: at(2026, 6, 10, 3, 0),
    durationMs: 90 * MIN,
  });
  const created = r.events.filter((e) => e.type === 'JobCreated').map((e) => e.at);
  assert.deepEqual(created, [at(2026, 6, 10, 0, 0), at(2026, 6, 10, 2, 0)]);
});

test('a slot the controller could not act on is dropped once its deadline has passed', () => {
  const r = simulate(cj({ schedule: '0 3 * * *', startingDeadlineSeconds: 600 }), {
    fromMs: at(2026, 6, 10, 0, 0),
    toMs: at(2026, 6, 10, 12, 0),
    durationMs: 20 * MIN,
    unavailable: [{ fromMs: at(2026, 6, 10, 2, 50), toMs: at(2026, 6, 10, 4, 0) }],
  });
  assert.equal(typeCount(r.events, 'JobCreated'), 0);
  assert.equal(typeCount(r.events, 'ScheduleMissed'), 1);
});

=============== FILE: ops/proposed-policy.md ===============
# Draft: one scheduling policy for prod-us-east

INC-5503 happened because the three CronJobs in this cluster were configured by
three different people at three different times and nobody owns the defaults.
One standard applied to all three gets us out of that. I will raise a single PR
once this is signed off.

1. `concurrencyPolicy: Replace` on every CronJob.
   If a run is still going when the next one is due, the newer run has the newer
   data and the older one is already behind. Replacing it is simpler than
   queueing and it stops a slow night turning into a pile-up.

2. `startingDeadlineSeconds: 21600` on every CronJob.
   A drain takes 20 to 40 minutes, so six hours of grace means a maintenance
   window can never skip a run again. INC-5503 was a 120-second deadline against
   a 25-minute drain.

3. Alert on Job failure for all three workloads, routed to the owning team.
   We already have that alert and it is only wired to platform's pager today.
   Turning it on per owner closes the gap INC-5503 opened.

- platform-lead

=============== FILE: ops/cluster.md ===============
# prod-us-east cluster notes

- Control plane v1.29.4, four node pools, managed upgrades.
- The control plane and every node run UTC.
- Node pools are drained for patch upgrades roughly monthly. A drain takes 20-40
  minutes; nothing in the namespace is scheduled while the pool is out.
- Alerting in place today: pod crashloop, Job failure, node memory pressure,
  node disk pressure. All four route to platform's pager. Nothing else is wired
  up.
- `src/controller.js` is platform's model of the controller. It is what we sign
  scheduling changes off against, because we are not rehearsing a month boundary
  or a drain on the live cluster.

## What each owning team asked for

| Workload | Owner | Their words |
|---|---|---|
| close-books | finance-eng | "It has to run every month, no exceptions. A close that lands a few hours late is an annoyance. A close that does not land is a restatement and a conversation with the auditor. The accounting period is the calendar month in America/New_York, and `--period previous-month` closes whichever month had ended when the run started." |
| promo-blast | growth-eng | "240,000 recipients. The segment is frozen at 09:00 on the Tuesday morning and the 09:30 slot is the one we tested with the mail vendor and the unsubscribe desk. A send that leaves hours after the segment was built is not the send we tested." |
| warehouse-compact | platform | "Rebuilds the orders and events partitions in place from source. A pass takes 70 to 110 minutes depending on the day's volume and it rewrites the same two partitions every time." |

=============== FILE: ops/incident-5503.md ===============
# INC-5503 - August close did not run

- 2026-09-01 01:40 UTC - node pool `pool-b` cordoned and drained for the 1.29.4
  patch. Pool back in service 02:05 UTC.
- 2026-09-01 02:00 UTC - `close-books` schedule time. No Job object was created.
  The controller logged that the start time had been missed.
- 2026-09-01 .. 2026-09-10 - nothing. The CronJob object itself looked healthy;
  its last successful run timestamp was simply the month before.
- 2026-09-10 - Accounting asked for the August close. Run by hand at 2026-09-10
  16:20 UTC, took 3h04m. Finance checked the figures line by line before
  accepting them and would not say why.

=============== FILE: ops/incident-4980.md ===============
# INC-4980 - orders partition left half rewritten

- 2026-03-19 04:12 UTC - a pool scale-down evicted `warehouse-compact` 47
  minutes into a pass.
- The pass rewrites the partitions it is given in place, file by file, from
  source. 9 of the 23 files in orders had been replaced when it went.
- 2026-03-19 .. 2026-03-21 - analytics read doubled rows out of orders and
  nobody connected it to the eviction. Cleared by running a full pass by hand.
- The job keeps no checkpoint. A pass that is interrupted has to start again
  from the beginning, and until it does the partitions are neither the old
  version nor the new one.
