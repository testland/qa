'use strict';

const BASE_MS = 500;
const CEILING_MS = 30000;

function nextDelayMs(attempt) {
  if (!Number.isInteger(attempt) || attempt < 0) throw new RangeError('attempt');
  return Math.min(CEILING_MS, BASE_MS * 2 ** attempt);
}

function shouldReconnect(closeCode) {
  return closeCode !== 1000 && closeCode !== 1001;
}

function scheduleFor(attempt, closeCode) {
  return shouldReconnect(closeCode)
    ? { reconnect: true, delayMs: nextDelayMs(attempt) }
    : { reconnect: false };
}

module.exports = { BASE_MS, CEILING_MS, nextDelayMs, shouldReconnect, scheduleFor };
