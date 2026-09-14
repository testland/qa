# A reinstall before every spec fixed the order-dependence and tripled the CI bill

## Problem Description

Larder is our React Native grocery app. It has ten end-to-end spec files. Run
any one of them alone and it is green. Run the whole suite and everything from
the third file onwards falls over with `element(by.id('home-search')) not
found`, because the file before it finished on the order-detail screen and the
next one starts by assuming it is on home. Our fault, nobody else's.

A contractor fixed it on 29 August by putting a full uninstall and reinstall of
the app into the shared `beforeEach`, so every spec starts from a virgin
install. It worked. It also took the suite from **4m12s to 44m56s** and our
macOS runner minutes for September are 2.9x August. Finance found it before we
did. His contract ended on Friday.

Priya has PR #764 open and it is the only proposal anyone has actually written.
It drops the reinstall and starts a fresh copy of the already-installed app
before each spec instead, with a 1.5 second settle afterwards because the first
tap on a cold process was landing before the bundle was ready. Nine consecutive
green nights, **9m50s**, three approvals. Her note on the patch argues the
point directly: a JS-level reload only swaps the bundle, so anything the native
side is still holding — the navigation stack, the image cache, the keyboard —
survives it, and a fresh process is the only reset she trusts, for six seconds
a spec. I am one click from merging it and I would like to know if I should.

The other thing I want out of this is one rule that covers every spec file.
Three of the ten currently do their own thing in their own hooks, and Marek is
right that ten different answers to "how does a spec start" is exactly the mess
I am trying to leave — every exception is one more thing the next person has to
learn before they can write a spec. He wants the hold-outs brought into line
with whatever the shared rule ends up being. Priya deliberately left them alone
because she did not want to touch anything she did not understand.

The shared hooks, five of the ten spec files, Priya's patch, the timings and
the onboarding module with its unit tests are attached.

## Output Specification

1. Decide what PR #764 should become and land that: rewrite `e2e/init.js`, and
   edit any spec file your decision actually changes.
2. Write `docs/e2e-lifecycle.md` — the rule for how a spec starts, the answer
   Priya gets on her patch, and the answer Marek gets on the hold-outs.
3. State in that document what you expect the suite to cost once your change is
   in, and on what basis.

## Input Files

Extract the following files before beginning.

=============== FILE: e2e/init.js ===============
const { device } = require('detox');

// Added 2026-08-29 to stop cross-spec state leakage. Every spec starts from a
// clean install. Green but slow - revisit if CI cost bites.
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
// Covers LDR-2210: a push notification tapped from the lock screen lands the
// shopper on the order itself, not on home.
describe('Deep links', () => {
  it('opens straight to an order from a larder:// link', async () => {
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
// Covers LDR-1877: the in-app banner reflects the OS notification grant and
// does not reappear once the shopper has granted.
describe('Notification permissions', () => {
  it('hides the opt-in banner when notifications are granted', async () => {
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
// Covers LDR-2402: the welcome tour is offered once and never again.
describe('Welcome tour', () => {
  beforeEach(async () => {
    await device.launchApp({ delete: true, newInstance: true });
  });

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

=============== FILE: patches/pr-764.diff ===============
From: Priya Ganesan <priya@larder.example>
Subject: [PATCH] e2e: stop reinstalling the app before every spec

9m50s, nine green nights, three approvals.

A JS-level reload only swaps the bundle. Anything the native side is holding -
navigation stack, image cache, keyboard, whatever the previous file left on
screen - survives it, and I am not signing up for chasing that down again in
three weeks. A fresh process is the only reset I actually trust and it costs
six seconds a spec.

I left onboarding.test.js alone. It runs its own hook, I do not know why, and I
was not going to find out on a Thursday.

--- a/e2e/init.js
+++ b/e2e/init.js
@@ -1,8 +1,11 @@
 const { device } = require('detox');

-// Added 2026-08-29 to stop cross-spec state leakage. Every spec starts from a
-// clean install. Green but slow - revisit if CI cost bites.
+const SETTLE_MS = 1500;
+
 beforeEach(async () => {
-  await device.launchApp({ delete: true, newInstance: true });
+  await device.launchApp({ newInstance: true });
+  // First tap on a cold process was landing before the bundle was ready.
+  await new Promise((r) => setTimeout(r, SETTLE_MS));
 });

=============== FILE: reports/suite-timings.md ===============
# e2e suite timings, ios.sim.debug, single simulator

## Before 2026-08-29 - no shared hook, order-dependent

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
| onboarding.test.js   | 2     | 0m40s    |
| **total**            | 24    | **4m12s**|

Green only file by file. Full-suite run: 14 of 24 specs failed.

Every one of those 14 failures was on the first line of a spec, and every one
named an element belonging to a screen the previous file had navigated away
from. Not one of them was a stale cart total, a stale filter, a signed-in
session that should not have been, or a welcome tour that should have been
offered and was not.

## After 2026-08-29 - uninstall + reinstall before every spec

24 of 24 green. **44m56s.** macOS runner minutes: August 610, September 1780
and counting.

## Priya's branch, PR #764 - fresh process + 1.5s settle before every spec

24 of 24 green, nine consecutive nights. **9m50s.**

## What we have actually measured on our runner

| Operation                                      | Cost   |
|------------------------------------------------|--------|
| uninstall + install + cold start               | 1m52s  |
| starting a fresh process of the installed app  | 6.5s   |

Nobody has instrumented anything else.

=============== FILE: app/onboarding-gate.js ===============
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOUR_KEY, shouldOfferTour, markTourSeen } from '../src/onboarding';

export async function loadTourState() {
  const raw = await AsyncStorage.getItem(TOUR_KEY);
  return raw === null ? {} : { [TOUR_KEY]: JSON.parse(raw) };
}

export async function offerTour() {
  return shouldOfferTour(await loadTourState());
}

export async function recordTourSeen() {
  const next = markTourSeen(await loadTourState());
  await AsyncStorage.setItem(TOUR_KEY, JSON.stringify(next[TOUR_KEY]));
  return next;
}

=============== FILE: src/onboarding.js ===============
'use strict';

const TOUR_KEY = 'onboarding.tourSeenVersion';
const CURRENT_TOUR_VERSION = 3;

function shouldOfferTour(stored) {
  const seen = stored[TOUR_KEY];
  if (seen === undefined) return true;
  if (!Number.isInteger(seen)) throw new RangeError(TOUR_KEY);
  return seen < CURRENT_TOUR_VERSION;
}

function markTourSeen(stored) {
  return { ...stored, [TOUR_KEY]: CURRENT_TOUR_VERSION };
}

module.exports = { TOUR_KEY, CURRENT_TOUR_VERSION, shouldOfferTour, markTourSeen };

=============== FILE: test/onboarding.test.js ===============
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { TOUR_KEY, shouldOfferTour, markTourSeen } = require('../src/onboarding.js');

test('a shopper with nothing recorded is offered the tour', () => {
  assert.equal(shouldOfferTour({}), true);
});

test('a shopper recorded at the current version is not offered it again', () => {
  assert.equal(shouldOfferTour(markTourSeen({})), false);
});

test('an older recorded version is offered the new tour', () => {
  assert.equal(shouldOfferTour({ [TOUR_KEY]: 1 }), true);
});

test('a corrupt record is rejected rather than guessed', () => {
  assert.throws(() => shouldOfferTour({ [TOUR_KEY]: 'yes' }), RangeError);
});

test('markTourSeen does not mutate its input', () => {
  const before = {};
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
