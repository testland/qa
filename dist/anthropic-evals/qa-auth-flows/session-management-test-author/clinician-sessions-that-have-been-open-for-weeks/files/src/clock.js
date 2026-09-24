'use strict';

// Injectable clock: session behaviour over long spans is testable without waiting.
function createClock(startMs) {
  let now = startMs;
  return {
    now: () => now,
    tick: (ms) => {
      now += ms;
      return now;
    },
  };
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

module.exports = { createClock, MINUTE, HOUR, DAY };
