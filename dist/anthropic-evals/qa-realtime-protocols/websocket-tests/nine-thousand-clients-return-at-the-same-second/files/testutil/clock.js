'use strict';

// Deterministic stand-in for setTimeout; queued work runs only when the clock is advanced.
function createClock() {
  let now = 0;
  let tasks = [];

  return {
    schedule(fn, delay) {
      const task = { at: now + delay, fn };
      tasks.push(task);
      return task;
    },
    time() {
      return now;
    },
    pending() {
      return tasks.length;
    },
    tick(ms) {
      const until = now + ms;
      for (;;) {
        tasks.sort((a, b) => a.at - b.at);
        const next = tasks[0];
        if (!next || next.at > until) {
          break;
        }
        tasks = tasks.slice(1);
        now = next.at;
        next.fn();
      }
      now = until;
    },
  };
}

module.exports = { createClock };
