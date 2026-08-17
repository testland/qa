# Our "cross-platform" suite is really an Android suite

## Problem Description

We merged the iOS and Android suites into one last quarter and it mostly
worked. Six of the twenty-two tests still fail on iOS only, and always in the
same way: the run reaches a driver call and gets back "Method is not
implemented" or "Unknown mobile command". Same spec, same locators, passes on
Android, dies on iOS. The team's current workaround is a `SKIP_IOS` list in the
CI config that nobody has revisited since March, so those six flows are
untested on iOS and the dashboard still reads 22/22 green.

Separately, `test/helpers/waitForSync.js` has become the slowest thing we own.
It polls the badge in a tight loop up to two hundred times waiting for the
background sync to land. On the local emulator the whole helper takes a second
or two. On the device farm the same helper takes about four minutes per call
and it is called in eleven tests, which is most of our farm bill.

We are not splitting the suite back up. That was the whole point of merging it.

## Output Specification

1. Make the six failing tests work on both platforms. For each call that fails
   on iOS, either use something the iOS side actually supports, or restructure
   the test so it does not need that call.
2. Where a capability genuinely exists on one platform only, the test must be
   limited to the platform that supports it in a way the report shows as not
   run, and the reason recorded. A silently green test is worse than a red one.
3. Deliver `docs/platform-support.md`: for each call the suite makes, state
   whether each platform's automation backend supports it and what the
   equivalent is where it differs.
4. Fix `test/helpers/waitForSync.js` so it does not cost minutes on a remote
   device, and state in the answer why it is fast locally and slow on the farm.
5. Do not split the suite into per-platform copies, and do not delete the six
   tests.

## Input Files

Extract the following files before beginning.

=============== FILE: test/specs/deeplink.spec.js ===============
describe('deep links', () => {
  it('opens the order screen from a deep link', async () => {
    await driver.startActivity('com.acme.shop', '.DeepLinkActivity');
    await expect(driver.$('~order-screen')).toBeDisplayed();
  });

  it('returns to the catalog with the back control', async () => {
    await driver.$('~order-screen').waitForDisplayed();
    await driver.pressKeyCode(4);
    await expect(driver.$('~catalog-screen')).toBeDisplayed();
  });
});

=============== FILE: test/specs/offline.spec.js ===============
const waitForSync = require('../helpers/waitForSync');

describe('offline behaviour', () => {
  it('queues an order while the device is offline', async () => {
    await driver.toggleWiFi();
    await driver.$('~product-0').click();
    await driver.$('~add-to-cart').click();
    await expect(driver.$('~queued-badge')).toBeDisplayed();

    await driver.toggleWiFi();
    await waitForSync(driver, '~cart-count', '1');
    await expect(driver.$('~queued-badge')).not.toBeDisplayed();
  });

  it('shows the sync notification', async () => {
    await driver.openNotifications();
    await expect(driver.$('~sync-complete-notification')).toBeDisplayed();
  });
});

=============== FILE: test/specs/logs.spec.js ===============
describe('crash reporting', () => {
  it('writes a breadcrumb file on a handled error', async () => {
    await driver.$('~trigger-handled-error').click();
    const out = await driver.execute('mobile: shell', {
      command: 'cat',
      args: ['/data/data/com.acme.shop/files/breadcrumbs.log'],
    });
    if (!out.includes('handled-error')) throw new Error('no breadcrumb written');
  });

  it('keeps the app usable after a handled error', async () => {
    await driver.$('~dismiss-error').click();
    await expect(driver.$('~catalog-screen')).toBeDisplayed();
  });
});

=============== FILE: test/helpers/waitForSync.js ===============
module.exports = async function waitForSync(driver, selector, expected) {
  for (let i = 0; i < 200; i++) {
    const el = await driver.$(selector);
    const text = await el.getText();
    if (text === expected) return;
  }
  throw new Error(`${selector} never became ${expected}`);
};

=============== FILE: ci/skip-ios.json ===============
{
  "comment": "temporary - added 2026-03, revisit",
  "skip": [
    "deep links opens the order screen from a deep link",
    "deep links returns to the catalog with the back control",
    "offline behaviour queues an order while the device is offline",
    "offline behaviour shows the sync notification",
    "crash reporting writes a breadcrumb file on a handled error",
    "crash reporting keeps the app usable after a handled error"
  ]
}
