# The retry test just sits there and then times out

## Problem Description

`src/retry.js` calls a function, and on failure waits before trying again -
1s, then 2s, then gives up. In production that is what we want. In a test we
obviously cannot sit through it.

The test we wrote freezes the clock and pushes it forward by a second, which we
expected to be enough for the second attempt to fire. Instead the test never
finishes: it hangs until the runner kills it with a timeout, reporting that the
promise never settled. The suite is red right now because of it -
`src/attempts.test.js` is green and unrelated.

Pushing the clock forward by more does nothing. Neither does pushing it forward
several times in a row. The moment we take the frozen clock out, the test passes
and takes three seconds, which is what we were trying to avoid.

## Output Specification

1. `npm test` exits clean in roughly a second - no real waiting, no shortened
   production delays.
2. `src/retry.test.js` covers three behaviours:
   - a call that succeeds on the first attempt, with no waiting involved;
   - a call that fails twice and succeeds on the third attempt, asserting that
     the next attempt has not happened before its scheduled wait has elapsed and
     has happened once it has;
   - a call that fails every attempt, where the caller receives the last error.
3. Do not modify `src/retry.js` - not the delays, not the attempt count, and do
   not add a parameter to make the waiting injectable.
4. Do not raise the per-test time limit, and do not add packages to
   `package.json`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "sync-worker",
  "version": "0.4.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^2.1.8"
  }
}

=============== FILE: src/retry.js ===============
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function retry(fn, { attempts = 3, baseDelayMs = 1000 } = {}) {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await sleep(baseDelayMs * 2 ** attempt);
    }
  }

  throw lastError;
}

=============== FILE: src/retry.test.js ===============
import { expect, test, vi } from 'vitest';
import { retry } from './retry.js';

test('retries until the call succeeds', async () => {
  vi.useFakeTimers();
  const fn = vi
    .fn()
    .mockRejectedValueOnce(new Error('boom'))
    .mockResolvedValueOnce('ok');

  const result = retry(fn);
  vi.advanceTimersByTime(1000);

  await expect(result).resolves.toBe('ok');
  expect(fn).toHaveBeenCalledTimes(2);
});

=============== FILE: src/attempts.js ===============
export function delaysFor(attempts, baseDelayMs) {
  return Array.from(
    { length: Math.max(0, attempts - 1) },
    (_, index) => baseDelayMs * 2 ** index,
  );
}

=============== FILE: src/attempts.test.js ===============
import { expect, test } from 'vitest';
import { delaysFor } from './attempts.js';

test('doubles the wait between attempts', () => {
  expect(delaysFor(3, 1000)).toEqual([1000, 2000]);
});

test('a single attempt never waits', () => {
  expect(delaysFor(1, 1000)).toEqual([]);
});
