# Throttling and plan limits are only covered by the success case

## Problem Description

`src/sendMessage.js` sits behind `POST /messages`. Two separate limits apply
to it: a short burst limit per API key inside a rolling window, and a monthly
allowance per account tied to the plan. They are different refusals - one
clears on its own, the other does not until the customer upgrades - and
support answers them with different replies.

The clock is passed in as `now`, so the whole thing is drivable from a test
without waiting or faking timers.

Last quarter a change to the window bookkeeping made a throttled call consume
the caller's monthly allowance. Customers on the free plan burned their month
in an afternoon of retries. The only test we have sends one message and checks
it was delivered.

## Output Specification

1. Add `src/sendMessage.test.js` covering the refusal paths, driving `now`
   explicitly rather than waiting on real time.
2. A refused call that still delivered a message or still consumed monthly
   allowance must fail the suite, and the two refusal families must not be
   interchangeable.
3. Do not modify `src/sendMessage.js`; its current behaviour is the
   specification.
4. Leave `src/sendMessage.happy.test.js` in place.
5. Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "messaging-edge",
  "version": "3.7.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/sendMessage.js ===============
'use strict';

const WINDOW_MS = 60000;
const BURST_LIMIT = 5;
const MONTHLY_QUOTA = { free: 10, pro: 1000 };

const API_KEYS = {
  'key-free': { accountId: 'acc_1', plan: 'free' },
  'key-pro': { accountId: 'acc_2', plan: 'pro' },
};

function createState() {
  return { windows: new Map(), usage: new Map(), delivered: [] };
}

function sendMessage(state, { apiKey, body, now }) {
  const credentials = API_KEYS[apiKey];
  if (!credentials) {
    return { status: 401, code: 'API_KEY_UNKNOWN', retryAfterMs: null };
  }
  if (typeof body !== 'string' || body.trim() === '') {
    return { status: 400, code: 'BODY_REQUIRED', retryAfterMs: null };
  }

  const open = state.windows.get(apiKey);
  const expired = !open || now - open.startedAt >= WINDOW_MS;
  const window = expired ? { startedAt: now, count: 0 } : open;

  if (window.count >= BURST_LIMIT) {
    return {
      status: 429,
      code: 'RATE_LIMITED',
      retryAfterMs: window.startedAt + WINDOW_MS - now,
    };
  }

  const used = state.usage.get(credentials.accountId) || 0;
  if (used >= MONTHLY_QUOTA[credentials.plan]) {
    return { status: 403, code: 'QUOTA_EXHAUSTED', retryAfterMs: null };
  }

  window.count += 1;
  state.windows.set(apiKey, window);
  state.usage.set(credentials.accountId, used + 1);
  state.delivered.push({ accountId: credentials.accountId, body, at: now });
  return { status: 202, code: null, retryAfterMs: null };
}

module.exports = { createState, sendMessage, WINDOW_MS, BURST_LIMIT, MONTHLY_QUOTA };

=============== FILE: src/sendMessage.happy.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createState, sendMessage } = require('./sendMessage');

test('delivers a message', () => {
  const state = createState();
  const result = sendMessage(state, { apiKey: 'key-free', body: 'hello', now: 1000 });
  assert.equal(result.status, 202);
  assert.equal(state.delivered.length, 1);
});
