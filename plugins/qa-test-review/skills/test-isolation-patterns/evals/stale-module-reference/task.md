# configure() works everywhere except inside our test file

## Problem Description

Two tests in `tests/client.test.js` fail: `honours a configured retry count`
and `builds the endpoint for a configured region`. In both of them the call to
`configure()` appears to do nothing at all - the client keeps reporting the
defaults.

The same two calls work in a scratch script, and they work in production. The
tests that assert the defaults pass, which is what makes this confusing: the
client is reading something, it is just never reading what the test wrote.

The clean-up hook was added a while ago because settings were leaking between
tests. Calling `reset()` more often, or earlier, changes nothing.

## Output Specification

1. Make all five tests pass, changing only `tests/client.test.js`. Do not
   modify `src/settings.js` or `src/client.js`, and do not change any
   assertion, expected value or test name.
2. Every test must still start from the default settings regardless of what
   ran before it - do not make the file pass by reordering tests or by
   relying on the current order.
3. Run `npm test` before you finish; it must pass.
4. Produce `reset-notes.md` explaining why `configure()` had no visible effect
   inside this file while working outside it, why calling `reset()` more often
   made no difference, and the rule for restoring shared state in tests we
   write later.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "api-client",
  "version": "2.0.1",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/settings.js ===============
'use strict';

const defaults = { region: 'eu', endpoint: 'https://eu.api.test', retries: 2 };

let current = { ...defaults };

function settings() {
  return current;
}

function configure(patch) {
  Object.assign(current, patch);
}

function reset() {
  current = { ...defaults };
}

module.exports = { defaults, settings, configure, reset };

=============== FILE: src/client.js ===============
'use strict';

const { settings } = require('./settings');

const config = settings();

let cachedEndpoint = null;

function endpoint() {
  if (cachedEndpoint === null) {
    cachedEndpoint = `${config.endpoint}/v1/${config.region}`;
  }
  return cachedEndpoint;
}

function retries() {
  return config.retries;
}

function resetCache() {
  cachedEndpoint = null;
}

module.exports = { endpoint, retries, resetCache };

=============== FILE: tests/client.test.js ===============
'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { configure, reset } = require('../src/settings');
const client = require('../src/client');

beforeEach(() => {
  reset();
});

test('uses the default retry count', () => {
  assert.equal(client.retries(), 2);
});

test('honours a configured retry count', () => {
  configure({ retries: 5 });
  assert.equal(client.retries(), 5);
});

test('goes back to the default retry count', () => {
  assert.equal(client.retries(), 2);
});

test('builds the endpoint for a configured region', () => {
  configure({ region: 'us', endpoint: 'https://us.api.test' });
  assert.equal(client.endpoint(), 'https://us.api.test/v1/us');
});

test('builds the endpoint for the default region', () => {
  assert.equal(client.endpoint(), 'https://eu.api.test/v1/eu');
});
