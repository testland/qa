# Two weeks of waiting before a forced runtime upgrade, and forty legacy test files

## Problem Description

Security has given us until 2026-09-30 to get Ledgerline off Electron 13. The
internal advisory is attached. There is no backport to the 13 line.

We cannot actually do the upgrade yet. Our native statement parser
(`@ledgerline/statement-parse`) has to be rebuilt against the new ABI, that work
is with the vendor, and their last estimate was the 22nd. So we have roughly two
weeks of waiting, then about a week to land everything, and I want to spend the
waiting productively rather than have the whole conversion land in one panicked
week.

The conversion is the problem. About forty files under `tests/e2e/legacy/` are
driven by Spectron, which our `package.json` pins at `^13.0.0`. The rest -
around twenty files - are already on the newer driver and are fine.

Four things I need answered, and I would like as many of them to be yes as the
facts allow, because nine engineer-days is what we have:

1. Anselm says there is a later Spectron than the one we are pinned to, and that
   bumping it would carry the legacy suite far enough forward that we could
   leave those forty files alone for now. Find out and do it if it works.

2. Can we run the legacy suite and the converted files side by side in CI for
   the two or three weeks it takes to work through them, or does the switchover
   have to happen on one commit?

3. Better version of the same idea, from Priya: convert each file in place but
   keep both drivers in it until we are happy, so every converted test can be
   run against its legacy twin in the same file and we can see them agree before
   we delete the old half. She has already done this to
   `tests/e2e/window-lifecycle.spec.ts` as a trial.

4. Can the team start writing the converted files today, on 13.1.7, so that the
   upgrade week is just the upgrade? Or does every one of those forty files have
   to wait for the vendor?

On that trial file: `tests/e2e/window-lifecycle.spec.ts` has hung in CI since
Priya pushed it in July. The job sits there until the twenty-minute cap kills
it. Nobody has reproduced it locally on the first attempt - it usually works
once and then hangs. It is attached.

## Output Specification

1. `docs/upgrade-test-plan.md` - answer all four numbered questions separately,
   each with the reason behind the answer, and say what the team should be doing
   during the two weeks of waiting.
2. Fix `tests/e2e/window-lifecycle.spec.ts`.
3. Edit `package.json` only where your answer actually requires it.
4. Do not modify `tests/e2e/legacy/menus.spec.js` or
   `tests/e2e/preferences.spec.ts`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "ledgerline-desktop",
  "version": "4.7.2",
  "private": true,
  "scripts": {
    "test:legacy": "mocha tests/e2e/legacy --timeout 30000",
    "test:e2e": "playwright test --config=playwright.electron.config.ts"
  },
  "devDependencies": {
    "@ledgerline/statement-parse": "2.4.0",
    "@playwright/test": "^1.47.0",
    "electron": "13.1.7",
    "mocha": "^10.4.0",
    "spectron": "^13.0.0"
  }
}

=============== FILE: docs/security/ADV-2026-0412.md ===============
# ADV-2026-0412 - renderer sandbox escape via a crafted PDF stream

Status: fix available upstream
Affected: Electron 13.x through 30.0.5 (bundled Chromium)
Fixed in: Electron 30.0.6, 31.0.0 and later
Backport to 13.x: none. The 13.x line reached end of support on 2022-05-24 and
receives no further security releases of any kind.

Ledgerline exposure: the ledger import view renders customer-supplied PDFs in a
renderer process. Security signed off on a 30-day remediation window closing
2026-09-30. A compensating control was discussed and rejected on 2026-08-31 -
the import view is the product's primary ingest path and cannot be disabled.

=============== FILE: tests/e2e/window-lifecycle.spec.ts ===============
import { test, expect, _electron as electron } from '@playwright/test';

const Application = require('spectron').Application;

let legacyApp: any;

test.beforeAll(async () => {
  legacyApp = new Application({ path: require('electron'), args: ['.'] });
  await legacyApp.start();
});

test.afterAll(async () => {
  if (legacyApp && legacyApp.isRunning()) {
    await legacyApp.stop();
  }
});

test('main window is visible - legacy', async () => {
  expect(await legacyApp.browserWindow.isVisible()).toBe(true);
});

test('main window is visible - converted', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  await expect(window.getByRole('heading', { name: 'Ledgerline' })).toBeVisible();

  await app.close();
});

test('window count returns to one after preferences closes - legacy', async () => {
  expect(await legacyApp.client.getWindowCount()).toBe(1);
});

=============== FILE: tests/e2e/legacy/menus.spec.js ===============
const assert = require('node:assert');
const Application = require('spectron').Application;

describe('application menus', function () {
  this.timeout(30000);
  let app;

  before(async () => {
    app = new Application({ path: require('electron'), args: ['.'] });
    await app.start();
  });

  after(async () => {
    if (app && app.isRunning()) {
      await app.stop();
    }
  });

  it('opens with a single window', async () => {
    assert.strictEqual(await app.client.getWindowCount(), 1);
  });

  it('exposes the File menu', async () => {
    const label = await app.client.$('[role="menubar"] >> nth=0').getText();
    assert.match(label, /File/);
  });
});

=============== FILE: tests/e2e/preferences.spec.ts ===============
import { test, expect, _electron as electron } from '@playwright/test';

test('preferences persists the currency setting', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'Preferences' }).click();
  const preferences = await app.waitForEvent('window');

  await preferences.getByLabel('Reporting currency').selectOption('EUR');
  await preferences.getByRole('button', { name: 'Save' }).click();

  const stored = await app.evaluate(({ app: electronApp }) => electronApp.getPath('userData'));
  expect(stored).toContain('Ledgerline');

  await app.close();
});

=============== FILE: reports/ci-window-lifecycle.txt ===============
--- desktop-e2e #1904, 2026-07-29 ---
Running 3 tests using 1 worker

  ok 1 window-lifecycle.spec.ts > main window is visible - legacy

  (no further output for 19m 41s)

Error: The operation was canceled.
Reason: job exceeded the 20 minute timeout

--- desktop-e2e #1907, 2026-07-30 ---
Running 3 tests using 1 worker

  ok 1 window-lifecycle.spec.ts > main window is visible - legacy
  ok 2 window-lifecycle.spec.ts > main window is visible - converted

  (no further output for 19m 12s)

Error: The operation was canceled.
Reason: job exceeded the 20 minute timeout

--- local, Priya's machine, 2026-08-04 ---
$ npx playwright test tests/e2e/window-lifecycle.spec.ts
  3 passed (14.2s)

$ npx playwright test tests/e2e/window-lifecycle.spec.ts
  ok 1 main window is visible - legacy
  ^C after 6 minutes
