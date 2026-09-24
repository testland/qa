# Eleven green end-to-end runs while checkout was broken in every one of them

## Problem Description

Larder is our React Native grocery app. Build 412 went out on Tuesday and
support had 40 tickets by Thursday morning: you tap **Place order**, the order
is created, and then the app sits on a blank white screen forever. The
confirmation screen throws on render because the orders API renamed
`order.reference` to `order.referenceCode` back in build 401 and nobody updated
the screen. That part is understood and a fix is already in review — I am not
asking about the app bug, and I do not want anyone touching
`app/OrderConfirmationScreen.jsx`.

What I have to explain to my director on Monday is the CI history. The
end-to-end job on `main` ran eleven times between build 401 and build 412 and
was green all eleven times. `e2e/checkout.test.js` taps through the basket,
places an order, and checks the confirmation screen and the reference printed
on it. The confirmation screen has not rendered since the second of July.

Two people have opinions and I have to answer both of them by Monday:

- Priya wants `testTimeout` in the Jest config raised from two minutes to five.
  Her theory is that the CI simulators are slower than our laptops and things
  are being cut off before they finish.
- Marcus wrote a `settle()` helper — three seconds of waiting after a tap — and
  merged it into `e2e/account.test.js` three weeks ago. That file has needed
  nothing since, which is more than anyone else can say, and he wants it across
  the other 11 spec files before 1.9.0. Nobody has offered an alternative and I
  am fairly close to letting him do it.

Four spec files are attached, along with the run history, the Jest config, the
confirmation screen and the promo banner component. Tell me why the job did not
go red on any of the eleven builds, and give me back specs I can trust.

## Output Specification

1. Go through the four attached spec files and repair any that would not have
   gone red on build 412. Leave alone any that are already sound, and do not
   change which behaviours a spec checks or delete a spec.
2. Write `docs/why-eleven-runs-were-green.md` explaining the CI history, and
   give me your answer on Marcus's helper and on Priya's timeout so I can put it
   in writing on Monday.
3. Say in that document what the remaining 8 spec files need from us.

## Input Files

Extract the following files before beginning.

=============== FILE: e2e/checkout.test.js ===============
describe('Checkout', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('places an order and shows the confirmation', async () => {
    await element(by.id('product-OAT-1')).tap();
    await element(by.id('add-to-cart-button')).tap();
    await element(by.id('cart-tab')).tap();
    await element(by.id('place-order-button')).tap();

    await waitFor(element(by.id('order-confirmation'))).toBeVisible();
    await waitFor(element(by.id('order-reference'))).toHaveText('LD-40122');
  });

  it('shows the delivery window on the confirmation', async () => {
    await element(by.id('product-OAT-1')).tap();
    await element(by.id('add-to-cart-button')).tap();
    await element(by.id('cart-tab')).tap();
    await element(by.id('place-order-button')).tap();

    await waitFor(element(by.id('delivery-window'))).toHaveText('Thu 08:00-10:00');
  });

  it('blocks an empty cart from checking out', async () => {
    await element(by.id('cart-tab')).tap();
    await waitFor(element(by.id('place-order-button'))).not.toBeVisible();
    await waitFor(element(by.id('empty-cart-hint'))).toBeVisible();
  });
});

=============== FILE: e2e/account.test.js ===============
const { settle } = require('./helpers/settle');

describe('Account', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('saves a new delivery address', async () => {
    await element(by.id('account-tab')).tap();
    await settle();
    await element(by.id('edit-address-button')).tap();
    await element(by.id('address-line-1')).replaceText('14 Bridge Street');
    await element(by.id('save-address-button')).tap();
    await settle();

    await expect(element(by.id('address-summary'))).toHaveText('14 Bridge Street');
  });

  it('uploads an avatar', async () => {
    await element(by.id('account-tab')).tap();
    await element(by.id('change-avatar-button')).tap();
    await element(by.id('avatar-source-camera-roll')).tap();
    await settle();
    await settle();
    await settle();

    await expect(element(by.id('avatar-image'))).toBeVisible();
  });

  it('signs out', async () => {
    await element(by.id('account-tab')).tap();
    await element(by.id('sign-out-button')).tap();
    await expect(element(by.id('sign-in-screen'))).toBeVisible();
  });
});

=============== FILE: e2e/promos.test.js ===============
describe('Promo codes', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('applies a valid promo code', async () => {
    await element(by.id('cart-tab')).tap();
    await element(by.id('promo-input')).typeText('WELCOME10');
    await element(by.id('apply-promo-button')).tap();
    await expect(element(by.id('subtotal'))).toHaveText('$22.49');
  });

  it('does not show an error for a valid promo code', async () => {
    await element(by.id('cart-tab')).tap();
    await element(by.id('promo-input')).typeText('WELCOME10');
    await element(by.id('apply-promo-button')).tap();
    await expect(element(by.id('promo-error'))).not.toBeVisible();
  });

  it('rejects an expired promo code', async () => {
    await element(by.id('cart-tab')).tap();
    await element(by.id('promo-input')).typeText('SUMMER24');
    await element(by.id('apply-promo-button')).tap();
    await expect(element(by.id('promo-error-banner'))).toBeVisible();
  });
});

=============== FILE: e2e/search.test.js ===============
describe('Search', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('finds a product by name', async () => {
    await element(by.id('home-search')).tap();
    await element(by.id('home-search')).typeText('oat milk');
    await expect(element(by.id('result-OAT-1'))).toBeVisible();
  });

  it('shows the empty state for a term with no matches', async () => {
    await element(by.id('home-search')).tap();
    await element(by.id('home-search')).typeText('xylophone');
    await expect(element(by.id('search-empty-state'))).toBeVisible();
  });
});

=============== FILE: e2e/helpers/settle.js ===============
// Added on branch marcus/stabilise-e2e. Suite is much steadier with this after
// every tap. Roll out to the remaining spec files before 1.9.0.
const SETTLE_MS = 3000;

async function settle(ms = SETTLE_MS) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { settle, SETTLE_MS };

=============== FILE: e2e/jest.config.js ===============
/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.test.js'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
};

=============== FILE: reports/e2e-runs.md ===============
# e2e job on `main`, builds 401-412

Configuration `ios.sim.debug`, 26 specs across 12 spec files, one simulator, no
retries configured.

| Build | Date       | Result | Suite | checkout | account | promos | search |
|-------|------------|--------|-------|----------|---------|--------|--------|
| 401   | 2026-07-02 | pass   | 38s   | 0.9s     | 15.4s   | 3.3s   | 6.1s   |
| 402   | 2026-07-09 | pass   | 39s   | 0.9s     | 15.9s   | 3.4s   | 6.2s   |
| 403   | 2026-07-16 | pass   | 37s   | 0.8s     | 15.1s   | 3.3s   | 6.0s   |
| 404   | 2026-07-23 | pass   | 41s   | 1.0s     | 16.2s   | 3.5s   | 6.4s   |
| 405   | 2026-07-30 | pass   | 38s   | 0.9s     | 15.5s   | 3.4s   | 6.2s   |
| 406   | 2026-08-06 | pass   | 40s   | 0.9s     | 15.8s   | 3.4s   | 6.3s   |
| 407   | 2026-08-13 | pass   | 39s   | 0.9s     | 15.3s   | 3.3s   | 6.1s   |
| 408   | 2026-08-20 | pass   | 44s   | 0.9s     | 21.6s   | 3.4s   | 6.2s   |
| 409   | 2026-08-27 | pass   | 43s   | 0.9s     | 21.4s   | 3.3s   | 6.2s   |
| 410   | 2026-09-03 | pass   | 42s   | 0.9s     | 21.5s   | 3.4s   | 6.1s   |
| 411   | 2026-09-08 | pass   | 43s   | 1.0s     | 21.7s   | 3.5s   | 6.3s   |
| 412   | 2026-09-10 | pass   | 43s   | 0.9s     | 21.6s   | 3.4s   | 6.2s   |

Notes collected while triaging:

- Nothing in the job has ever hit the 120s per-test limit. The whole suite has
  never taken more than 44 seconds.
- `account.test.js` went from ~15s to ~21s at build 408, which is when the
  `settle()` helper was merged into it.
- Timed by hand on the 412 simulator build: tapping the product, adding it,
  opening the basket and placing the order takes about four seconds from the
  first tap to the blank screen. It is not intermittent — it reproduces every
  time, on the simulator and on a device.
- The avatar upload goes out to the CDN. Instrumented on the CI runners it takes
  between 9.4s and 13.8s end to end, and it was that slow before build 408 as
  well.
- `promos.test.js` has gone red exactly once, on build 392, on `rejects an
  expired promo code`. Whoever fixed it that afternoon edited that one spec and
  nothing else in the file. Green on every run since.

=============== FILE: app/OrderConfirmationScreen.jsx ===============
import React from 'react';
import { View, Text } from 'react-native';

export default function OrderConfirmationScreen({ order }) {
  // Throws since build 401: the API now sends `referenceCode`, so `reference`
  // is undefined and `.toUpperCase()` blows up during render. Fix in review.
  const ref = order.reference.toUpperCase();

  return (
    <View testID="order-confirmation">
      <Text testID="order-reference">{ref}</Text>
      <Text testID="delivery-window">{order.deliveryWindow}</Text>
    </View>
  );
}

=============== FILE: app/PromoBanner.jsx ===============
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

// Split out of CheckoutScreen in build 392, when the banner grew a dismiss
// control and a second line of copy.
export default function PromoBanner({ error, onDismiss }) {
  if (!error) return null;

  return (
    <View testID="promo-error-banner">
      <Text testID="promo-error-message">{error.message}</Text>
      <TouchableOpacity testID="promo-error-dismiss" onPress={onDismiss}>
        <Text>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
}

=============== FILE: src/pricing.js ===============
'use strict';

const CENTS = (n) => Math.round(n * 100);

function lineTotal(unitPriceCents, quantity) {
  if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) throw new RangeError('unitPriceCents');
  if (!Number.isInteger(quantity) || quantity < 1) throw new RangeError('quantity');
  return unitPriceCents * quantity;
}

function applyPromo(subtotalCents, promo) {
  if (!promo) return subtotalCents;
  if (promo.kind === 'percent') return subtotalCents - Math.round((subtotalCents * promo.value) / 100);
  if (promo.kind === 'flat') return Math.max(0, subtotalCents - promo.value);
  throw new RangeError(`unknown promo kind: ${promo.kind}`);
}

function orderTotal(lines, promo, taxRateBps) {
  const subtotal = lines.reduce((sum, l) => sum + lineTotal(l.unitPriceCents, l.quantity), 0);
  const discounted = applyPromo(subtotal, promo);
  const tax = Math.round((discounted * taxRateBps) / 10000);
  return { subtotal, discounted, tax, total: discounted + tax };
}

module.exports = { CENTS, lineTotal, applyPromo, orderTotal };

=============== FILE: test/pricing.test.js ===============
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { lineTotal, applyPromo, orderTotal } = require('../src/pricing.js');

test('lineTotal multiplies unit price by quantity', () => {
  assert.equal(lineTotal(349, 3), 1047);
});

test('lineTotal rejects a zero quantity', () => {
  assert.throws(() => lineTotal(349, 0), RangeError);
});

test('applyPromo takes a percentage off', () => {
  assert.equal(applyPromo(1047, { kind: 'percent', value: 10 }), 942);
});

test('applyPromo never returns a negative subtotal', () => {
  assert.equal(applyPromo(500, { kind: 'flat', value: 900 }), 0);
});

test('orderTotal adds tax after the discount', () => {
  const r = orderTotal([{ unitPriceCents: 349, quantity: 3 }], { kind: 'percent', value: 10 }, 875);
  assert.deepEqual(r, { subtotal: 1047, discounted: 942, tax: 82, total: 1024 });
});
