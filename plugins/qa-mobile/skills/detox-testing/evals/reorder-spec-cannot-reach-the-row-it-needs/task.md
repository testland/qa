# The reorder spec cannot reach the row it needs, and the fix on the table slows the app down

## Problem Description

We shipped "reorder" last sprint — open an old order from the history list, tap
Reorder, the basket refills. QA wrote one end-to-end spec for it against our
React Native app and it has never passed. Two different errors, one after the
other, and both are in the attached log.

Vik's PR #901 makes both go away. It sets the history list to render a hundred
rows up front and turns off clipping of off-screen children, and it adds a
helper to the spec that scrolls eight times with a pause after each scroll. The
spec is green in six minutes.

Nadia, our performance lead, has measured the branch. Time-to-interactive on the
history screen goes from 240ms to 1.9s on the Pixel 6a, against a 400ms budget,
on the second most visited screen in the app. She has put a hold on production
changes to that screen for the rest of the sprint and she is not going to lift
it for a test.

Vik says that leaves him nowhere: the row the spec needs does not exist until
the list renders it, and the list will not render it. He has been at this for
four days and the spec has to land this week.

Work out what actually has to change, and give me something I can send to both
of them. The spec, the two components, both failure runs, the performance
numbers and Vik's patch are attached, along with the sorting module the screen
uses and its unit tests.

## Output Specification

1. Rewrite `e2e/reorder.test.js` so both errors are gone.
2. Change `app/OrderHistoryScreen.jsx` or `app/OrderRow.jsx` if your fix needs
   it.
3. Write `docs/pr-901-review.md`: the review Vik and Nadia both get. Cover each
   of the two errors separately, say what is landing and what is not, and say
   what Vik should do instead of what he has done.

## Input Files

Extract the following files before beginning.

=============== FILE: e2e/reorder.test.js ===============
describe('Reorder', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('reorders the most recent order', async () => {
    await element(by.id('orders-tab')).tap();
    await element(by.id('order-row')).atIndex(0).tap();
    await element(by.id('reorder-button')).tap();
    await expect(element(by.id('cart-count'))).toHaveText('1');
  });

  it('reorders an older order further down the list', async () => {
    await element(by.id('orders-tab')).tap();
    await element(by.id('order-row')).atIndex(30).tap();
    await element(by.id('reorder-button')).tap();
    await expect(element(by.id('cart-count'))).toHaveText('2');
  });

  it('skips out-of-stock lines when reordering', async () => {
    await element(by.id('orders-tab')).tap();
    await element(by.id('order-row')).atIndex(30).tap();
    await element(by.id('reorder-button')).tap();
    await expect(element(by.id('reorder-skipped-notice'))).toBeVisible();
  });
});

=============== FILE: app/OrderHistoryScreen.jsx ===============
import React from 'react';
import { FlatList, View } from 'react-native';
import OrderRow from './OrderRow';
import { sortOrders } from '../src/order-history';

export default function OrderHistoryScreen({ orders, onOpen }) {
  return (
    <View testID="order-history-screen">
      <FlatList
        testID="order-history-list"
        data={sortOrders(orders)}
        keyExtractor={(o) => String(o.id)}
        renderItem={({ item }) => <OrderRow order={item} onOpen={onOpen} />}
      />
    </View>
  );
}

=============== FILE: app/OrderRow.jsx ===============
import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { formatMoney } from '../src/format-money';

export default function OrderRow({ order, onOpen }) {
  return (
    <TouchableOpacity testID="order-row" onPress={() => onOpen(order.id)}>
      <View>
        <Text testID="order-row-date">{order.placedAt}</Text>
        <Text testID="order-row-total">{formatMoney(order.totalCents, order.locale)}</Text>
      </View>
    </TouchableOpacity>
  );
}

=============== FILE: reports/reorder-failures.log ===============
# Run 1 - as first written, ios.sim.debug

FAIL e2e/reorder.test.js
  x reorders the most recent order
      Multiple elements were matched: "id == order-row". Please use
      atIndex(<index>) to select one of the elements, or refine the matcher
      so that it resolves to a single element.
      Matched 9 elements.

# Run 2 - after QA added atIndex, ios.sim.debug

FAIL e2e/reorder.test.js
  v reorders the most recent order (4.1 s)
  x reorders an older order further down the list
      Index 30 out of bounds: the matcher "id == order-row" resolved to
      9 elements.
  x skips out-of-stock lines when reordering
      Index 30 out of bounds: the matcher "id == order-row" resolved to
      9 elements.

Notes from QA:
- The test account has 40 orders. Order 1042 is the 31st of them, counting from
  the newest, and that is the one the second and third specs are about.
- Scrolling down to order 1042 by hand on the simulator and then re-running the
  spec makes it pass, so the row itself is fine once it is on screen.
- The account gains orders every sprint. Order 1042 is the 31st today and will
  be the 44th next quarter.

=============== FILE: reports/history-screen-perf.md ===============
# Order history screen, time to interactive

Pixel 6a, release build, cold navigation from the home tab, median of 20 runs.
Test account has 40 orders.

| Build                                   | TTI   | Frames dropped on first scroll |
|-----------------------------------------|-------|--------------------------------|
| main @ 2.4.0                            | 240ms | 0                              |
| main + PR #901                          | 1.9s  | 11                             |

Order history is the second most visited screen in the app (18.4% of sessions).
Our internal budget for a list screen is 400ms TTI and zero dropped frames on
the first scroll. PR #901 misses both by a wide margin.

Nadia: "Blocking, and I am holding production changes on that screen until the
sprint closes. We are not making the screen four times slower for every
customer so that one spec can find a row."

=============== FILE: patches/pr-901.diff ===============
From: Vik Raman <vik@larder.example>
Subject: [PATCH] reorder: make the history spec reach row 31

Four days on this. Green in 6m02s. I could not find another way to get at a row
the list has not rendered.

--- a/app/OrderHistoryScreen.jsx
+++ b/app/OrderHistoryScreen.jsx
@@ -9,6 +9,9 @@ export default function OrderHistoryScreen({ orders, onOpen }) {
       <FlatList
         testID="order-history-list"
         data={sortOrders(orders)}
+        initialNumToRender={100}
+        windowSize={21}
+        removeClippedSubviews={false}
         keyExtractor={(o) => String(o.id)}
         renderItem={({ item }) => <OrderRow order={item} onOpen={onOpen} />}
       />

--- a/e2e/reorder.test.js
+++ b/e2e/reorder.test.js
@@ -1,3 +1,14 @@
+const SCROLL_STEPS = 8;
+const SETTLE_MS = 1500;
+
+async function scrollDownABit() {
+  for (let i = 0; i < SCROLL_STEPS; i++) {
+    await element(by.id('order-history-list')).scroll(250, 'down');
+    await new Promise((r) => setTimeout(r, SETTLE_MS));
+  }
+}
+
 describe('Reorder', () => {
   beforeAll(async () => {
     await device.launchApp({ newInstance: true });
@@ -11,13 +22,15 @@ describe('Reorder', () => {
   it('reorders an older order further down the list', async () => {
     await element(by.id('orders-tab')).tap();
+    await scrollDownABit();
     await element(by.id('order-row')).atIndex(30).tap();
     await element(by.id('reorder-button')).tap();
     await expect(element(by.id('cart-count'))).toHaveText('2');
   });

   it('skips out-of-stock lines when reordering', async () => {
     await element(by.id('orders-tab')).tap();
+    await scrollDownABit();
     await element(by.id('order-row')).atIndex(30).tap();
     await element(by.id('reorder-button')).tap();
     await expect(element(by.id('reorder-skipped-notice'))).toBeVisible();
   });

=============== FILE: src/order-history.js ===============
'use strict';

function byNewestFirst(a, b) {
  return b.placedAt.localeCompare(a.placedAt);
}

function sortOrders(orders) {
  return [...orders].sort(byNewestFirst);
}

function groupByMonth(orders) {
  const out = new Map();
  for (const o of sortOrders(orders)) {
    const key = o.placedAt.slice(0, 7);
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(o);
  }
  return out;
}

function reorderableSkus(order) {
  return order.lines.filter((l) => l.inStock).map((l) => l.sku);
}

module.exports = { sortOrders, groupByMonth, reorderableSkus };

=============== FILE: test/order-history.test.js ===============
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { sortOrders, groupByMonth, reorderableSkus } = require('../src/order-history.js');

const ORDERS = [
  { id: 1042, placedAt: '2024-02-11', lines: [{ sku: 'OAT-1', inStock: true }, { sku: 'FIG-9', inStock: false }] },
  { id: 1188, placedAt: '2024-03-02', lines: [{ sku: 'RYE-3', inStock: true }] },
  { id: 1001, placedAt: '2024-02-02', lines: [] },
];

test('orders sort newest first', () => {
  assert.deepEqual(sortOrders(ORDERS).map((o) => o.id), [1188, 1042, 1001]);
});

test('sortOrders does not mutate its input', () => {
  sortOrders(ORDERS);
  assert.equal(ORDERS[0].id, 1042);
});

test('grouping keys are year-month', () => {
  assert.deepEqual([...groupByMonth(ORDERS).keys()], ['2024-03', '2024-02']);
});

test('each month keeps its orders newest first', () => {
  assert.deepEqual(groupByMonth(ORDERS).get('2024-02').map((o) => o.id), [1042, 1001]);
});

test('only in-stock lines can be reordered', () => {
  assert.deepEqual(reorderableSkus(ORDERS[0]), ['OAT-1']);
  assert.deepEqual(reorderableSkus(ORDERS[2]), []);
});
