# A fresh install before every spec fixed the order-dependence and tripled our CI bill

## Problem Description

Our React Native app has ten end-to-end spec files. Run any one of them on its
own and it is green. Run the whole suite and everything from the third file
onwards falls over with `element(by.id('home-search')) not found` — because the
file before it finished on the order-detail screen and the next one starts by
assuming it is on home. Classic, and entirely our fault.

Two weeks ago a contractor fixed it. His change puts a full uninstall and
reinstall of the app in the shared `beforeEach`, so every spec starts from a
virgin install. It does work — the suite has been green every night since.

It also took the suite from **4m12s to 44m56s**, and our macOS runner minutes
for September are already 2.9x August. Finance noticed before we did. The
contractor's contract ended last Friday.

I want this reverted, but I do not want the order-dependence back, and there is
a complication. Before he arrived, Dana tried the obvious cheap alternative —
resetting the app between specs without reinstalling — and some files broke that
had been fine. She could not work out why, gave up after an afternoon, and that
is part of why we ended up with the reinstall for everything. Her results from
that attempt are in the timings report.

So: get me back to something that runs in single-digit minutes and keeps the
suite order-independent. What I would really like is one rule that applies to
every spec file, because bespoke setup per file is exactly how we got into this
— ten different answers to "how does a spec start" is the state I am trying to
leave, and every exception is a thing the next person has to learn.

The shared hooks, five of the ten spec files and the timings report are
attached, along with the onboarding module and its unit tests.

## Output Specification

1. Rewrite `e2e/init.js` so the suite no longer reinstalls the app before every
   spec.
2. Edit any spec files that need to change as a consequence of that.
3. Write `docs/e2e-lifecycle.md`: the rule the team should follow for how a spec
   starts. It needs to be specific enough that the next person does not
   rediscover Dana's afternoon.

## Input Files

Extract the following files before beginning.

=============== FILE: e2e/init.js ===============
const { device } = require('detox');

// Added 2026-08-29 to stop cross-spec state leakage. Every spec now starts from
// a clean install. Suite is green but slow - revisit if CI cost bites.
beforeEach(async () => {
  await device.launchApp({ delete: true, newInstance: true });
});

=============== FILE: e2e/browse.test.js ===============
describe('Browse', () => {
  it('searches the catalogue', async () => {
    await element(by.id('home-search')).tap();
    await element(by.id('home-search')).typeText('oat milk');
    await expect(element(by.id('result-OAT-1'))).toBeVisible();
  });

  it('opens a product from search results', async () => {
    await element(by.id('home-search')).tap();
    await element(by.id('home-search')).typeText('oat milk');
    await element(by.id('result-OAT-1')).tap();
    await expect(element(by.id('product-title'))).toHaveText('Barista Oat Milk 1L');
  });
});

=============== FILE: e2e/cart.test.js ===============
describe('Cart', () => {
  it('adds a product to the cart', async () => {
    await element(by.id('home-search')).tap();
    await element(by.id('home-search')).typeText('oat milk');
    await element(by.id('result-OAT-1')).tap();
    await element(by.id('add-to-cart-button')).tap();
    await expect(element(by.id('cart-count'))).toHaveText('1');
  });

  it('merges a second add of the same product', async () => {
    await element(by.id('home-search')).tap();
    await element(by.id('home-search')).typeText('oat milk');
    await element(by.id('result-OAT-1')).tap();
    await element(by.id('add-to-cart-button')).tap();
    await element(by.id('add-to-cart-button')).tap();
    await expect(element(by.id('cart-count'))).toHaveText('2');
  });
});

=============== FILE: e2e/deeplink.test.js ===============
// Covers LDR-2210: a push notification tapped from the lock screen must land
// the user on the order, not on home. The app must be started BY the link.
describe('Deep links', () => {
  it('opens straight to an order when launched from a larder:// link', async () => {
    await device.launchApp({ newInstance: true, url: 'larder://orders/9912' });
    await expect(element(by.id('order-detail-9912'))).toBeVisible();
    await expect(element(by.id('order-status'))).toHaveText('Out for delivery');
  });

  it('opens the tracking map from a tracking link', async () => {
    await device.launchApp({ newInstance: true, url: 'larder://orders/9912/track' });
    await expect(element(by.id('tracking-map'))).toBeVisible();
  });
});

=============== FILE: e2e/permissions.test.js ===============
// Covers LDR-1877: the in-app banner must reflect the OS notification grant,
// and must not reappear once the user has granted.
describe('Notification permissions', () => {
  it('hides the opt-in banner when notifications are already granted', async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
    await element(by.id('account-tab')).tap();
    await expect(element(by.id('notifications-optin-banner'))).not.toBeVisible();
  });

  it('shows the opt-in banner when notifications are denied', async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'NO' } });
    await element(by.id('account-tab')).tap();
    await expect(element(by.id('notifications-optin-banner'))).toBeVisible();
  });
});

=============== FILE: e2e/onboarding.test.js ===============
// Covers LDR-2402: the welcome tour is offered once and never again. The
// "seen" flag is written to AsyncStorage by src/onboarding.js.
describe('Welcome tour', () => {
  it('offers the tour to a shopper who has not seen it', async () => {
    await expect(element(by.id('welcome-tour'))).toBeVisible();
    await element(by.id('welcome-tour-next')).tap();
    await element(by.id('welcome-tour-next')).tap();
    await element(by.id('welcome-tour-done')).tap();
    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('does not offer the tour again once it has been dismissed', async () => {
    await element(by.id('welcome-tour-skip')).tap();
    await device.reloadReactNative();
    await expect(element(by.id('welcome-tour'))).not.toBeVisible();
    await expect(element(by.id('home-screen'))).toBeVisible();
  });
});

=============== FILE: reports/suite-timings.md ===============
# e2e suite timings, ios.sim.debug, single simulator

## Before 2026-08-29 (no shared beforeEach, order-dependent)

| Spec file            | Specs | Duration |
|----------------------|-------|----------|
| browse.test.js       | 2     | 0m19s    |
| cart.test.js         | 2     | 0m22s    |
| checkout.test.js     | 4     | 0m48s    |
| account.test.js      | 3     | 0m31s    |
| orders.test.js       | 3     | 0m34s    |
| search.test.js       | 2     | 0m18s    |
| promos.test.js       | 2     | 0m21s    |
| deeplink.test.js     | 2     | 0m26s    |
| permissions.test.js  | 2     | 0m33s    |
| **total**            | 22    | **4m12s**|

Green only when run file-by-file. Full-suite run: 14 of 22 specs failed, all
with `element(...) not found` on the first line of the spec.

## After 2026-08-29 (uninstall + reinstall in beforeEach)

| Spec file            | Specs | Duration |
|----------------------|-------|----------|
| browse.test.js       | 2     | 3m44s    |
| cart.test.js         | 2     | 3m45s    |
| checkout.test.js     | 4     | 7m28s    |
| account.test.js      | 3     | 5m36s    |
| orders.test.js       | 3     | 5m37s    |
| search.test.js       | 2     | 3m44s    |
| promos.test.js       | 2     | 3m43s    |
| deeplink.test.js     | 2     | 3m46s    |
| permissions.test.js  | 2     | 3m45s    |
| onboarding.test.js   | 2     | 3m48s    |
| **total**            | 24    | **44m56s**|

24 of 24 green. `onboarding.test.js` was added on 2026-09-02 and so does not
appear in either of the other two runs below.

Instrumented on our runner, per spec:

| Operation                                   | Cost   |
|---------------------------------------------|--------|
| uninstall + install + cold start            | 1m52s  |
| cold relaunch of the already-installed app  | 6.5s   |
| JS reload of the running app                | 0.8s   |

macOS runner minutes: August 610, September 1780 and counting.

## Dana's attempt, 2026-08-21 (reset between specs, no reinstall)

Suite ran in 4m38s. 19 of 22 green, which was a big improvement on 8 of 22.
The three that broke, and had not been broken before:

```
FAIL e2e/deeplink.test.js
  x opens straight to an order when launched from a larder:// link
      Expected element with id "order-detail-9912" to be visible.
      Got: element with id "home-screen" is visible.
  x opens the tracking map from a tracking link
      Expected element with id "tracking-map" to be visible.
      Got: element with id "home-screen" is visible.

FAIL e2e/permissions.test.js
  x hides the opt-in banner when notifications are already granted
      Expected element with id "notifications-optin-banner" not to be visible.
      Got: element with id "notifications-optin-banner" is visible.
```

Dana's note: "out of time, handing back."

=============== FILE: src/onboarding.js ===============
'use strict';

const TOUR_KEY = 'onboarding.tourSeenVersion';
const CURRENT_TOUR_VERSION = 3;

function shouldOfferTour(storage) {
  const seen = storage[TOUR_KEY];
  if (seen === undefined) return true;
  if (!Number.isInteger(seen)) throw new RangeError(TOUR_KEY);
  return seen < CURRENT_TOUR_VERSION;
}

function markTourSeen(storage) {
  return { ...storage, [TOUR_KEY]: CURRENT_TOUR_VERSION };
}

function freshInstallStorage() {
  return {};
}

module.exports = { TOUR_KEY, CURRENT_TOUR_VERSION, shouldOfferTour, markTourSeen, freshInstallStorage };

=============== FILE: test/onboarding.test.js ===============
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { TOUR_KEY, shouldOfferTour, markTourSeen, freshInstallStorage } = require('../src/onboarding.js');

test('a fresh install is offered the tour', () => {
  assert.equal(shouldOfferTour(freshInstallStorage()), true);
});

test('a shopper who has seen the current tour is not offered it again', () => {
  assert.equal(shouldOfferTour(markTourSeen(freshInstallStorage())), false);
});

test('an older recorded version is offered the new tour', () => {
  assert.equal(shouldOfferTour({ [TOUR_KEY]: 1 }), true);
});

test('a corrupt flag is rejected rather than guessed', () => {
  assert.throws(() => shouldOfferTour({ [TOUR_KEY]: 'yes' }), RangeError);
});

test('markTourSeen does not mutate its input', () => {
  const before = freshInstallStorage();
  markTourSeen(before);
  assert.deepEqual(before, {});
});

=============== FILE: src/session.js ===============
'use strict';

function emptySession() {
  return { screen: 'home', cart: [], filters: {}, banner: null };
}

function addToCart(session, sku, qty = 1) {
  const existing = session.cart.find((l) => l.sku === sku);
  const cart = existing
    ? session.cart.map((l) => (l.sku === sku ? { ...l, qty: l.qty + qty } : l))
    : [...session.cart, { sku, qty }];
  return { ...session, cart };
}

function navigate(session, screen) {
  return { ...session, screen };
}

function reset(session) {
  return { ...emptySession(), filters: session.filters };
}

function cartCount(session) {
  return session.cart.reduce((n, l) => n + l.qty, 0);
}

module.exports = { emptySession, addToCart, navigate, reset, cartCount };

=============== FILE: test/session.test.js ===============
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { emptySession, addToCart, navigate, reset, cartCount } = require('../src/session.js');

test('a new session starts on home with an empty cart', () => {
  assert.deepEqual(emptySession(), { screen: 'home', cart: [], filters: {}, banner: null });
});

test('adding the same sku twice merges the lines', () => {
  const s = addToCart(addToCart(emptySession(), 'OAT-1'), 'OAT-1', 2);
  assert.deepEqual(s.cart, [{ sku: 'OAT-1', qty: 3 }]);
  assert.equal(cartCount(s), 3);
});

test('navigate does not disturb the cart', () => {
  const s = navigate(addToCart(emptySession(), 'OAT-1'), 'checkout');
  assert.equal(s.screen, 'checkout');
  assert.equal(cartCount(s), 1);
});

test('reset clears cart and screen but keeps saved filters', () => {
  const s = reset({
    screen: 'checkout',
    cart: [{ sku: 'OAT-1', qty: 4 }],
    filters: { vegan: true },
    banner: 'welcome-back',
  });
  assert.equal(s.screen, 'home');
  assert.equal(cartCount(s), 0);
  assert.deepEqual(s.filters, { vegan: true });
});

test('addToCart does not mutate its input', () => {
  const before = emptySession();
  addToCart(before, 'OAT-1');
  assert.equal(before.cart.length, 0);
});
