# The same cart test exists twice and the two copies have drifted

## Problem Description

We maintain the cart test twice: once under `test/android/` and once under
`test/ios/`. They were copied from each other eighteen months ago and have been
diverging ever since. The Android copy grew a "remove the item again" assertion
last spring; nobody added it to the iOS copy, and last month we shipped an iOS
build where removing the last item left the badge showing 1. The Android copy
would have caught it.

Each copy has its own runner config and its own npm script, and CI has two
jobs, so every change to the flow is four edits and a reviewer who has to
diff two files that are supposed to be the same.

Running either one locally also needs a developer to have started the
automation server by hand in a second terminal first. People forget, get a
connection-refused, and lose ten minutes.

The two apps already ship the same accessibility identifiers on the elements
this test touches - that part was done properly.

## Output Specification

1. Deliver one spec file that covers the cart flow, run by both platforms.
2. Deliver one runner config that runs the whole suite against both platforms
   from a single command, with no file editing and no environment variable
   flipping between two invocations.
3. Both platforms must end up with the "remove the item again" coverage that
   only the Android copy has today.
4. Running the suite must not require a developer to have started anything by
   hand in another terminal first.
5. Delete what the change makes redundant. Do not leave the old per-platform
   copies in place "for now".

## Input Files

Extract the following files before beginning.

=============== FILE: test/android/cart.spec.js ===============
describe('cart (android)', () => {
  beforeEach(async () => {
    await driver.$('~skip-onboarding').click();
  });

  it('adds and removes an item', async () => {
    await driver.$('~product-0').click();
    await driver.$('~add-to-cart').click();
    await expect(driver.$('~cart-count')).toHaveText('1');

    await driver.$('~cart-tab').click();
    await driver.$('~remove-item-0').click();
    await expect(driver.$('~cart-count')).toHaveText('0');
  });
});

=============== FILE: test/ios/cart.spec.js ===============
describe('cart (ios)', () => {
  beforeEach(async () => {
    await driver.$('~skip-onboarding').click();
  });

  it('adds an item', async () => {
    await driver.$('~product-0').click();
    await driver.$('~add-to-cart').click();
    await expect(driver.$('~cart-count')).toHaveText('1');
  });
});

=============== FILE: wdio.android.conf.js ===============
exports.config = {
  runner: 'local',
  hostname: 'localhost',
  port: 4723,
  specs: ['./test/android/**/*.spec.js'],
  framework: 'mocha',
  reporters: ['spec'],
  maxInstances: 1,
  capabilities: [{
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'Android Emulator',
    'appium:app': process.env.ANDROID_APP || './build/app-debug.apk',
  }],
  mochaOpts: { timeout: 120000 },
};

=============== FILE: wdio.ios.conf.js ===============
exports.config = {
  runner: 'local',
  hostname: 'localhost',
  port: 4723,
  specs: ['./test/ios/**/*.spec.js'],
  framework: 'mocha',
  reporters: ['spec'],
  maxInstances: 1,
  capabilities: [{
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:deviceName': 'iPhone Simulator',
    'appium:app': process.env.IOS_APP || './build/Shop.app',
  }],
  mochaOpts: { timeout: 120000 },
};

=============== FILE: package.json ===============
{
  "name": "acme-shop-mobile-tests",
  "private": true,
  "scripts": {
    "mobile:android": "wdio run wdio.android.conf.js",
    "mobile:ios": "wdio run wdio.ios.conf.js"
  },
  "devDependencies": {
    "@wdio/appium-service": "^9.0.0",
    "@wdio/cli": "^9.0.0",
    "@wdio/local-runner": "^9.0.0",
    "@wdio/mocha-framework": "^9.0.0",
    "webdriverio": "^9.0.0"
  }
}
