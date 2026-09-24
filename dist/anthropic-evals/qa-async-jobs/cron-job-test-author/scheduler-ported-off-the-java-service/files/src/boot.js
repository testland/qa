'use strict';

const { replayMissed } = require('./catchup');
const { handlersFor } = require('./handlers');
const jobs = require('./jobs');
const lastRun = require('./state');

// Runs once when the worker starts, before the schedule loop takes over.
function bootReplay(io, nowMs, lastRunMs = lastRun) {
  const handlers = handlersFor(io);
  const replayed = {};
  for (const job of jobs) {
    replayed[job.name] = replayMissed(job, lastRunMs[job.name], nowMs, (j, atMs) => handlers[j.name](atMs));
  }
  return replayed;
}

module.exports = { bootReplay };
