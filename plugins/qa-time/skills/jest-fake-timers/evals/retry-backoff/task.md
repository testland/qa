# Retry backoff has no test

## Problem Description

`src/retry.js` retries a failing async call with exponential backoff. It is
used for our payment provider calls, so the retry schedule matters and we
have had one incident where it retried far faster than intended.

There is no test for the delay schedule. We want one that proves the waits
are 200ms, 400ms, 800ms - and that a test run does not actually take 1.4
seconds to prove it.

## Output Specification

Add `src/retry.test.js` covering:

1. A call that succeeds first time is not retried.
2. A call that fails twice then succeeds resolves with the eventual value,
   after exactly two waits.
3. The waits follow the documented exponential schedule.
4. A call that exhausts every attempt rejects with the last error.

`src/backoff.test.js` already passes; leave it as it is.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "payments-client",
  "version": "2.1.0",
  "private": true,
  "scripts": {
    "test": "jest"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}

=============== FILE: src/backoff.js ===============
const BASE_DELAY_MS = 200;
const MAX_RETRIES = 3;

function delayForAttempt(attempt) {
  return BASE_DELAY_MS * Math.pow(2, attempt);
}

module.exports = { delayForAttempt, BASE_DELAY_MS, MAX_RETRIES };

=============== FILE: src/retry.js ===============
const { delayForAttempt, MAX_RETRIES } = require('./backoff');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(operation) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES) {
        break;
      }
      await sleep(delayForAttempt(attempt));
    }
  }
  throw lastError;
}

module.exports = { withRetry };

=============== FILE: src/backoff.test.js ===============
const { delayForAttempt, BASE_DELAY_MS, MAX_RETRIES } = require('./backoff');

describe('delayForAttempt', () => {
  it('doubles each attempt', () => {
    expect(delayForAttempt(0)).toBe(200);
    expect(delayForAttempt(1)).toBe(400);
    expect(delayForAttempt(2)).toBe(800);
  });

  it('exposes its configuration', () => {
    expect(BASE_DELAY_MS).toBe(200);
    expect(MAX_RETRIES).toBe(3);
  });
});
