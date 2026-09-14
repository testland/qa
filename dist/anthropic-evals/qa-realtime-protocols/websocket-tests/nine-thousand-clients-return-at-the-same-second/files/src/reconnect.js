'use strict';

const RETRY_DELAY_MS = 1000;

function createReconnector(options) {
  const { open, schedule = setTimeout, maxAttempts = 10 } = options;
  let attempts = 0;
  let stopped = false;
  const delays = [];

  function attempt() {
    if (stopped) {
      return null;
    }
    attempts += 1;
    const socket = open();
    socket.on('open', () => {
      attempts = 0;
    });
    socket.on('close', () => {
      retry();
    });
    return socket;
  }

  function retry() {
    if (stopped || attempts >= maxAttempts) {
      return;
    }
    const delay = RETRY_DELAY_MS;
    delays.push(delay);
    schedule(attempt, delay);
  }

  return {
    start: attempt,
    stop() {
      stopped = true;
    },
    get attempts() {
      return attempts;
    },
    get delays() {
      return delays.slice();
    },
  };
}

module.exports = { createReconnector, RETRY_DELAY_MS };
