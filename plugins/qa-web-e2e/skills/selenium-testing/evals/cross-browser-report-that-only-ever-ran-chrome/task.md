# The nightly says Chrome and Firefox both passed; our Firefox users disagree

## Problem Description

We ship a storefront. Every night at 02:00 a job runs the end-to-end suite
against a self-hosted browser grid we stand up in CI. Since we set the matrix up
on 2026-06-02 the morning summary has said the same thing every single day:

```
chrome:  41/41 passed
firefox: 41/41 passed
```

On 2026-09-04 we shipped a sticky-header regression that only reproduces in
Firefox — the header eats the first click on the cart button. Support took 63
tickets in two days before anyone connected it to the release. The nightly was
green through all three nights the bug was live, including a night when a manual
tester reproduced it in Firefox on the same build.

Second problem, possibly the same problem, possibly not. Since the 2026-08-21
deploy the nightly sometimes never finishes. It burns the full 45 minutes and
the job gets killed. Roughly one night in four. The pattern I can see from the
partial logs: on every night that hangs there is at least one failing test in
the output before it stops making progress, and on every night that finishes
clean in nine minutes there are none. I widened the grid's session request
timeout to an hour back in August to stop a batch of "session not created"
errors and that did make those go away, so please don't tell me to widen
anything else.

Vlad shelled into the runner on 2026-09-10 while the grid was up and curled the
hub; his saved response is in the files along with everything the job touches.

I want three things: why the Firefox column was lying, how long it has been
lying, and the nightly not hanging any more.

## Output Specification

1. Fix the files in place. Keep the shapes we already use — this repo is not
   getting rewritten this week.
2. `npm test` runs the unit tests on Node's built-in runner and passes today. It
   must still pass, and it must be extended so the reporting problem cannot come
   back unnoticed.
3. Write `docs/nightly-e2e-findings.md`: what the Firefox column actually
   measured, the window during which it measured that, and the mechanism behind
   the hang — each with the line or file you are reading it from.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "shop-e2e",
  "private": true,
  "scripts": {
    "test": "node --test test/**/*.test.js",
    "e2e": "node e2e/run.js"
  },
  "dependencies": {
    "selenium-webdriver": "^4.27.0"
  }
}

=============== FILE: src/capabilities.js ===============
'use strict';

const GRID_URL = process.env.GRID_URL || 'http://localhost:4444';

function buildCapabilities(options = {}) {
  const browserName = process.env.BROWSER || 'chrome';
  return {
    browserName,
    platformName: 'linux',
    'se:name': options.name || 'e2e',
    'se:recordVideo': false,
  };
}

module.exports = { buildCapabilities, GRID_URL };

=============== FILE: test/capabilities.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { buildCapabilities, GRID_URL } = require('../src/capabilities');

test('buildCapabilities returns a capabilities object', () => {
  const caps = buildCapabilities();
  assert.ok(caps);
  assert.strictEqual(typeof caps.browserName, 'string');
});

test('buildCapabilities lets a caller name the session', () => {
  const caps = buildCapabilities({ name: 'checkout' });
  assert.strictEqual(caps['se:name'], 'checkout');
});

test('grid url falls back to the local hub', () => {
  assert.match(GRID_URL, /^https?:\/\//);
});

=============== FILE: e2e/support/session.js ===============
'use strict';

const { Builder } = require('selenium-webdriver');
const { buildCapabilities, GRID_URL } = require('../../src/capabilities');

let driver = null;
let failed = false;

async function startSession(name) {
  driver = await new Builder()
    .usingServer(GRID_URL)
    .withCapabilities(buildCapabilities({ name }))
    .build();
  return driver;
}

function markFailed() {
  failed = true;
}

// we keep the browser up when something failed so we can attach and screenshot it
async function endSession() {
  if (!failed) {
    await driver.quit();
  }
}

module.exports = { startSession, endSession, markFailed };

=============== FILE: e2e/run.js ===============
'use strict';

const fs = require('node:fs');
const { parseArgs } = require('node:util');
const { By, until } = require('selenium-webdriver');
const { startSession, endSession, markFailed } = require('./support/session');

const { values } = parseArgs({
  options: { browser: { type: 'string', default: 'chrome' } },
});

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// first two of the 41 specs; the other 39 follow the same shape
const specs = [
  {
    name: 'home page renders',
    run: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.css('[data-testid=hero]')), 10000);
    },
  },
  {
    name: 'add to cart from the product page',
    run: async (driver) => {
      await driver.get(`${BASE_URL}/products/BOOK-001`);
      const add = await driver.wait(
        until.elementIsEnabled(await driver.findElement(By.css('[data-testid=add-to-cart]'))),
        10000
      );
      await add.click();
      const count = await driver.findElement(By.css('[data-testid=cart-count]'));
      if ((await count.getText()) !== '1') throw new Error('cart count did not reach 1');
    },
  },
];

async function main() {
  const results = [];
  for (const spec of specs) {
    const driver = await startSession(spec.name);
    try {
      await spec.run(driver);
      results.push({ name: spec.name, ok: true });
    } catch (err) {
      markFailed();
      results.push({ name: spec.name, ok: false, error: String(err) });
    } finally {
      await endSession();
    }
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`${values.browser}: ${passed}/${results.length} passed`);
  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync(
    `reports/${values.browser}.json`,
    JSON.stringify({ browser: values.browser, passed, total: results.length, results }, null, 2)
  );
  process.exitCode = passed === results.length ? 0 : 1;
}

main();

=============== FILE: docker-compose.grid.yml ===============
services:
  selenium-hub:
    image: selenium/hub:4.27.0
    ports: ["4442:4442", "4443:4443", "4444:4444"]
    environment:
      SE_SESSION_REQUEST_TIMEOUT: 3600

  chrome-node:
    image: selenium/node-chrome:4.27.0
    depends_on: [selenium-hub]
    shm_size: 2gb
    environment:
      SE_EVENT_BUS_HOST: selenium-hub
      SE_EVENT_BUS_PUBLISH_PORT: 4442
      SE_EVENT_BUS_SUBSCRIBE_PORT: 4443
      SE_NODE_MAX_SESSIONS: 4

  firefox-node:
    image: selenium/node-firefox:4.27.0
    depends_on: [selenium-hub]
    shm_size: 2gb
    environment:
      SE_EVENT_BUS_HOST: selenium-hub
      SE_EVENT_BUS_PUBLISH_PORT: 4443
      SE_NODE_MAX_SESSIONS: 4

=============== FILE: .github/workflows/e2e.yml ===============
name: nightly-e2e

on:
  schedule:
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    strategy:
      fail-fast: false
      matrix:
        browser: [chrome, firefox]
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: docker compose -f docker-compose.grid.yml up -d
      - run: sleep 20
      - run: node e2e/run.js --browser=${{ matrix.browser }}
      - uses: actions/upload-artifact@v4
        with:
          name: e2e-${{ matrix.browser }}
          path: reports/

=============== FILE: reports/grid-status-2026-09-10.json ===============
{
  "value": {
    "ready": true,
    "message": "Selenium Grid ready.",
    "nodes": [
      {
        "id": "6f0b1a2c-9d44-4c0e-91aa-2f1c7d5b0e31",
        "uri": "http://172.19.0.4:5555",
        "maxSessions": 4,
        "availability": "UP",
        "slots": [
          { "id": { "hostId": "6f0b1a2c", "id": "a1" }, "stereotype": { "browserName": "chrome", "browserVersion": "131.0", "platformName": "linux" }, "session": null },
          { "id": { "hostId": "6f0b1a2c", "id": "a2" }, "stereotype": { "browserName": "chrome", "browserVersion": "131.0", "platformName": "linux" }, "session": null },
          { "id": { "hostId": "6f0b1a2c", "id": "a3" }, "stereotype": { "browserName": "chrome", "browserVersion": "131.0", "platformName": "linux" }, "session": null },
          { "id": { "hostId": "6f0b1a2c", "id": "a4" }, "stereotype": { "browserName": "chrome", "browserVersion": "131.0", "platformName": "linux" }, "session": null }
        ]
      }
    ]
  }
}

=============== FILE: reports/firefox.json ===============
{
  "browser": "firefox",
  "passed": 41,
  "total": 41,
  "results": []
}
