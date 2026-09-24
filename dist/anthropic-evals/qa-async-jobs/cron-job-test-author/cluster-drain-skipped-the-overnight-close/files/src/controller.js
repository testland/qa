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
