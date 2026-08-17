'use strict';

const clock = require('./clock');

function startTimer() {
  const startedAt = clock.now();
  return {
    elapsedMs: () => clock.now() - startedAt,
  };
}

module.exports = { startTimer };
