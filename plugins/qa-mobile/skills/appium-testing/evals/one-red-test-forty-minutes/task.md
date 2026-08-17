# One red test, forty minutes, and a device nobody can use afterwards

## Problem Description

`test/regression.spec.js` is a single test containing the whole regression
pass: sign in, browse, cart, checkout, order history, profile edit, sign out.
It takes about forty minutes. When something breaks in the middle - and it is
usually the cart - everything after it never runs, so we find out about the
checkout bug a day later, and the report is one red line that says "regression"
with a stack trace forty steps deep.

The worse half is what happens after a failure. The suite opens one session for
the whole run and there is no teardown, so a crash leaves that session open on
the server. The next run cannot get the device: the emulator is reported busy
and we get "original error: could not create session" until someone restarts
the automation server on the CI box. That has happened four times this month.

We are fine with the run taking longer. We are not fine with a mid-run failure
costing us the rest of the coverage, and we are not fine with hand-restarting
the server.

## Output Specification

1. Restructure the file so a failure names the flow that broke and does not
   stop the unrelated flows from running.
2. The device must be released even when a test throws, and even when the whole
   flow dies partway - not only on the happy path.
3. Every test must begin from a defined starting point rather than inheriting
   whatever the previous steps happened to leave on screen.
4. Coverage must be preserved: every checkpoint asserted today must still be
   asserted afterwards.
5. Do not duplicate the flow into every test to achieve independence - a
   forty-minute suite must not become a four-hour one.
6. Do not modify `test/helpers/appData.js`.

## Input Files

Extract the following files before beginning.

=============== FILE: test/regression.spec.js ===============
const { remote } = require('webdriverio');
const { seedUser, catalogItem } = require('./helpers/appData');

const caps = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'Android Emulator',
  'appium:app': process.env.ANDROID_APP || './build/app-debug.apk',
};

let driver;
let orderId;

describe('regression', () => {
  before(async () => {
    driver = await remote({ hostname: 'localhost', port: 4723, capabilities: caps });
  });

  it('full regression pass', async function () {
    this.timeout(45 * 60 * 1000);
    const user = seedUser();

    // --- sign in ---
    await driver.$('~email-field').setValue(user.email);
    await driver.$('~password-field').setValue(user.password);
    await driver.$('~sign-in').click();
    await expect(driver.$('~account-home')).toBeDisplayed();

    // --- browse ---
    await driver.$('~catalog-tab').click();
    await driver.$('~search').setValue(catalogItem().name);
    await expect(driver.$('~result-0')).toBeDisplayed();

    // --- cart ---
    await driver.$('~result-0').click();
    await driver.$('~add-to-cart').click();
    await expect(driver.$('~cart-count')).toHaveText('1');

    // --- checkout ---
    await driver.$('~cart-tab').click();
    await driver.$('~checkout').click();
    await driver.$('~card-number').setValue('4242424242424242');
    await driver.$('~pay').click();
    await expect(driver.$('~order-confirmed')).toBeDisplayed();
    orderId = await driver.$('~order-id').getText();

    // --- order history ---
    await driver.$('~account-tab').click();
    await driver.$('~orders').click();
    await expect(driver.$(`~order-${orderId}`)).toBeDisplayed();

    // --- profile edit ---
    await driver.$('~account-tab').click();
    await driver.$('~edit-profile').click();
    await driver.$('~display-name').setValue('QA Bot');
    await driver.$('~save').click();
    await expect(driver.$('~profile-saved-toast')).toBeDisplayed();

    // --- sign out ---
    await driver.$('~account-tab').click();
    await driver.$('~sign-out').click();
    await expect(driver.$('~sign-in')).toBeDisplayed();
  });
});

=============== FILE: test/helpers/appData.js ===============
// Seeds fixtures through the backend admin API. Owned by the platform team.
function seedUser() {
  return { email: `qa+${Date.now()}@acme.test`, password: 'correct horse' };
}

function catalogItem() {
  return { sku: 'SKU-1001', name: 'Wool blanket' };
}

module.exports = { seedUser, catalogItem };
