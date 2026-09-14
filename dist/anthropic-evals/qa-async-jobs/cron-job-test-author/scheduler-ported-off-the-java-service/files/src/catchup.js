'use strict';

const CATCH_UP_WINDOW_MS = 24 * 60 * 60 * 1000;

// The slots this job should have fired on, after afterMs and up to nowMs.
function missedSlots(job, afterMs, nowMs) {
  const step = job.everyMinutes * 60000;
  const out = [];
  for (let t = afterMs + step; t <= nowMs; t += step) out.push(t);
  return out;
}

// Called once when the worker boots, per job. run(job, atMs) is the job body.
function replayMissed(job, lastRunMs, nowMs, run) {
  const from = Math.max(lastRunMs, nowMs - CATCH_UP_WINDOW_MS);
  let replayed = 0;
  for (const slot of missedSlots(job, from, nowMs)) {
    if (slot > nowMs) break;
    run(job, nowMs);
    replayed += 1;
  }
  return replayed;
}

module.exports = { missedSlots, replayMissed, CATCH_UP_WINDOW_MS };
