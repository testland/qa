'use strict';

const wallClockMs = () => Date.now();

function startTimer(clock = wallClockMs) {
  return { clock, startedAt: clock() };
}

function elapsedMs(timer) {
  return timer.clock() - timer.startedAt;
}

// One row of the SLA evidence file: when the call finished, and how long it took.
function recordLatency(timer, budgetMs) {
  const elapsed = elapsedMs(timer);
  return {
    observedAt: new Date(timer.clock()).toISOString(),
    elapsedMs: elapsed,
    withinBudget: elapsed <= budgetMs,
  };
}

// Three regional collectors ship rows in; the auditors read them in one order.
function mergeCollectorRows(...batches) {
  return batches.flat().sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
}

module.exports = { startTimer, elapsedMs, recordLatency, mergeCollectorRows, wallClockMs };
