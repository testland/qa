# Mobile suite stopped starting sessions after the automation server upgrade

## Problem Description

We had the automation server pinned to an old major for about two years. A
security advisory forced us onto the current major last Friday and now not a
single mobile test gets as far as launching the app. Nothing about the app, the
emulator, or the tests changed in that window - only the server.

Two things show up in the log. The endpoint we have always posted to answers
404, and when we point the client at the bare host instead, the server rejects
the request and lists most of our capability keys as ones it does not
recognise. The keys are the same ones we have been passing for two years.

Session setup lives in exactly two files: `config/caps.js` holds the capability
sets and `test/hooks.js` builds the connection. The specs themselves never
touch either.

Rolling the server back is not an option - the advisory is why we upgraded.

## Output Specification

1. Update `config/caps.js` so the current server accepts both capability sets.
   The intent must stay identical: same platforms, same apps, same package /
   bundle targeting, same idle-timeout value.
2. Update `test/hooks.js` so the client posts to the endpoint the current
   server actually serves.
3. Keep both the Android and the iOS capability set. Neither may be dropped or
   commented out.
4. Do not modify `test/cart.spec.js` - assertions are out of scope for this
   change.

## Input Files

Extract the following files before beginning.

=============== FILE: config/caps.js ===============
exports.android = {
  platformName: 'Android',
  automationName: 'UiAutomator2',
  deviceName: 'Android Emulator',
  app: process.env.ANDROID_APP || './build/app-debug.apk',
  appPackage: 'com.acme.shop',
  appActivity: '.MainActivity',
  newCommandTimeout: 120,
};

exports.ios = {
  platformName: 'iOS',
  automationName: 'XCUITest',
  deviceName: 'iPhone Simulator',
  app: process.env.IOS_APP || './build/Shop.app',
  bundleId: 'com.acme.shop',
  newCommandTimeout: 120,
};

=============== FILE: test/hooks.js ===============
const { remote } = require('webdriverio');
const caps = require('../config/caps');

const HOST = process.env.APPIUM_HOST || 'localhost';
const PORT = Number(process.env.APPIUM_PORT || 4723);

async function newSession(platform) {
  return remote({
    hostname: HOST,
    port: PORT,
    path: '/wd/hub',
    logLevel: 'warn',
    capabilities: caps[platform],
  });
}

module.exports = { newSession };

=============== FILE: test/cart.spec.js ===============
const { newSession } = require('./hooks');

describe('cart', () => {
  let driver;
  const platform = process.env.TARGET || 'android';

  beforeEach(async () => {
    driver = await newSession(platform);
  });

  afterEach(async () => {
    if (driver) await driver.deleteSession();
  });

  it('adds an item to the cart', async () => {
    await (await driver.$('~product-0')).click();
    await (await driver.$('~add-to-cart')).click();
    const count = await (await driver.$('~cart-count')).getText();
    if (count !== '1') throw new Error(`expected 1, got ${count}`);
  });
});

=============== FILE: logs/upgrade-failure.log ===============
[HTTP] --> POST /wd/hub/session
[HTTP] {"capabilities":{"platformName":"Android", ... }}
[HTTP] <-- POST /wd/hub/session 404 4 ms - 211

# after retrying against the bare host:

[HTTP] --> POST /session
[HTTP] {"capabilities":{"platformName":"Android","automationName":"UiAutomator2", ... }}
[W3C] Encountered internal error running command: BadParametersError: Bad parameters:
[W3C] The following capabilities were provided, but are not recognized by Appium:
[W3C]   automationName, deviceName, app, appPackage, appActivity, newCommandTimeout.
[HTTP] <-- POST /session 400 21 ms - 1043
