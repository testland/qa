# CI has been testing Android only for four months

## Problem Description

`.github/workflows/mobile.yml` runs our mobile suite on every pull request, but
only against Android. The iOS half is commented out with a note saying the
simulator would not boot on the runner; the person who wrote it moved teams and
nobody has touched it since. We have shipped four iOS releases with no
automated coverage at all.

The Android leg is not healthy either. It fails on maybe a third of runs during
session creation, and when it does fail there is nothing to look at afterwards -
the job just goes red and whatever the run produced is gone.

The job also starts the automation server with a backgrounded shell command and
then goes straight into the tests, which is why the first-run-of-the-day
failures usually say connection refused.

Both platforms are supposed to run the same suite. We are not going back to two
suites - we merged them last quarter and that part is working.

## Output Specification

1. Rework the workflow so both platforms run on every pull request, in
   parallel, each on infrastructure that can actually host that platform's
   device.
2. Each leg must install everything it needs on a clean runner. Assume the
   runner images carry none of our automation dependencies.
3. Both legs run the same suite from the same config. Do not point them at
   separate test directories.
4. Whatever a failing run produces must survive the job.
5. Do not edit anything under `test/`, and do not change which specs exist.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/mobile.yml ===============
name: mobile

on:
  pull_request:

jobs:
  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci

      - run: npm install -g appium

      - name: start server
        run: appium &

      - name: run tests
        run: npx wdio run wdio.conf.js
        env:
          ANDROID_APP: ./build/app-debug.apk

      - name: upload results
        uses: actions/upload-artifact@v4
        with:
          name: results
          path: reports/

#  ios:
#    runs-on: ubuntu-latest
#    steps:
#      - uses: actions/checkout@v5
#      - run: npm ci
#      - run: npm install -g appium
#      - run: appium &
#      - run: npx wdio run wdio.conf.js
#    # disabled 2026-04: simulator never boots on the runner, ask #qa-help

=============== FILE: wdio.conf.js ===============
const TARGET = process.env.TARGET || 'android';

const android = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'Android Emulator',
  'appium:app': process.env.ANDROID_APP,
};

const ios = {
  platformName: 'iOS',
  'appium:automationName': 'XCUITest',
  'appium:deviceName': 'iPhone Simulator',
  'appium:app': process.env.IOS_APP,
};

exports.config = {
  runner: 'local',
  specs: ['./test/specs/**/*.spec.js'],
  framework: 'mocha',
  reporters: ['spec', ['junit', { outputDir: './reports' }]],
  maxInstances: 1,
  capabilities: [TARGET === 'ios' ? ios : android],
  mochaOpts: { timeout: 180000 },
};

=============== FILE: test/specs/cart.spec.js ===============
describe('cart', () => {
  it('adds an item', async () => {
    await driver.$('~product-0').click();
    await driver.$('~add-to-cart').click();
    await expect(driver.$('~cart-count')).toHaveText('1');
  });
});
