# The reorder spec cannot reach the row it needs, and the gesture it needs keeps getting eaten

## Problem Description

We shipped "reorder" last sprint: on the order history list you press and hold
a past order, a little menu comes up, you confirm, the basket refills. QA wrote
one end-to-end spec for it against our React Native app and it has never
passed. Three different failures in three runs, all in the attached log.

Vik's PR #901 makes all three go away and it is green on CI in six minutes. It
does two things. It sets the history list to render a hundred rows up front and
turns off clipping of off-screen children, so the row the spec wants actually
exists. And it replaces the press-and-hold with a helper that tries the gesture
up to five times, a second and a half apart, until the menu shows up.

Nadia, our performance lead, has measured the first half of that. Time to
interactive on the history screen goes from 240ms to 1.9s on a Pixel 6a against
a 400ms budget, on the second most visited screen in the app. She has put a
hold on production changes to that screen until the sprint closes and she is
not lifting it for a test.

The second half nobody has argued with, because it works. Vik's position is
that the gesture is simply unreliable on our CI hardware and retrying it is
what you do with an unreliable gesture. He has been on this for four days, he
is out of ideas, and the spec has to land this week.

Work out what actually has to change and give me something I can send to both
of them. The spec, the two components, the three failure runs, the CI lane
notes, Nadia's numbers and Vik's patch are attached, along with the sorting
module the screen uses and its unit tests.

## Output Specification

1. Rewrite `e2e/reorder.test.js` so all three failures are gone.
2. Change `app/OrderHistoryScreen.jsx` or `app/OrderRow.jsx` if your fix needs
   it, and change the CI lane setup if your fix needs that.
3. Write `docs/pr-901-review.md` — the review Vik and Nadia both get. Take the
   three failures one at a time, say what is landing and what is not, and say
   what Vik should do instead of what he has done.

## Input Files

Extract the following files before beginning.

=============== FILE: e2e/reorder.test.js ===============
// The E2E build lands on the orders tab: LDR-2298 made orders the default tab
// for accounts with an open delivery, and the seeded account has one.
describe('Reorder', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('reorders the most recent order', async () => {
    await element(by.id('order-row')).atIndex(0).longPress();
    await element(by.id('reorder-menu-confirm')).tap();
    await expect(element(by.id('cart-count'))).toHaveText('1');
  });

  it('reorders an older order further down the list', async () => {
    await element(by.id('order-row')).atIndex(30).longPress();
    await element(by.id('reorder-menu-confirm')).tap();
    await expect(element(by.id('cart-count'))).toHaveText('2');
  });

  it('skips out-of-stock lines when reordering', async () => {
    await element(by.id('order-row')).atIndex(30).longPress();
    await element(by.id('reorder-menu-confirm')).tap();
    await expect(element(by.id('reorder-skipped-notice'))).toBeVisible();
  });
});

=============== FILE: app/OrderHistoryScreen.jsx ===============
import React from 'react';
import { FlatList, View } from 'react-native';
import OrderRow from './OrderRow';
import { sortOrders } from '../src/order-history';

export default function OrderHistoryScreen({ orders, onOpen, onReorder }) {
  return (
    <View testID="order-history-screen">
      <FlatList
        testID="order-history-list"
        data={sortOrders(orders)}
        keyExtractor={(o) => String(o.id)}
        renderItem={({ item }) => <OrderRow order={item} onOpen={onOpen} onReorder={onReorder} />}
      />
    </View>
  );
}

=============== FILE: app/OrderRow.jsx ===============
import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { formatMoney } from '../src/format-money';

export default function OrderRow({ order, onOpen, onReorder }) {
  return (
    <TouchableOpacity
      testID="order-row"
      onPress={() => onOpen(order.id)}
      onLongPress={() => onReorder(order.id)}
    >
      <View>
        <Text testID="order-row-date">{order.placedAt}</Text>
        <Text testID="order-row-total">{formatMoney(order.totalCents, order.locale)}</Text>
      </View>
    </TouchableOpacity>
  );
}

=============== FILE: reports/reorder-failures.log ===============
# Run 1 - developer laptop, spec as first written, ios.sim.debug

FAIL e2e/reorder.test.js
  x reorders the most recent order
      Multiple elements were matched: "id == order-row". Please use
      atIndex(<index>) to select one of the elements, or refine the matcher
      so that it resolves to a single element.
      Matched 9 elements.
  x reorders an older order further down the list   [same output]
  x skips out-of-stock lines when reordering        [same output]

# Run 2 - developer laptop, after QA added atIndex, ios.sim.debug

FAIL e2e/reorder.test.js
  v reorders the most recent order (4.1 s)
  x reorders an older order further down the list
      Index 30 out of bounds: the matcher "id == order-row" resolved to
      9 elements.
  x skips out-of-stock lines when reordering
      Index 30 out of bounds: the matcher "id == order-row" resolved to
      9 elements.

# Run 3 - CI Mac mini, on Vik's branch before he added the retry helper

FAIL e2e/reorder.test.js
  x reorders the most recent order
      longPress on element with id "order-row" atIndex(0) - completed, no error
      Expected element with id "reorder-menu" to be visible.
      Got: no element with id "reorder-menu".
  v reorders an older order further down the list (7.3 s)
  v skips out-of-stock lines when reordering (6.9 s)

Notes from QA:
- The test account has 40 orders. Order 1042 is the 31st counting from the
  newest, and it is the one the second and third specs are about. The account
  gains orders every sprint: 1042 is the 31st today and will be the 44th next
  quarter.
- Scrolling down to 1042 by hand on the simulator and then re-running the spec
  makes run 2 pass, so the row itself is fine once it is on screen.
- Run 3 has repeated every night for nine nights. It is CI only - on a laptop
  all three specs pass on that branch. It is always the first spec of the run
  and only the first: we shuffled the order of the file to check and the
  failure moved with the position, not with the spec.
- In run 3 the row is on screen when the press happens - the screenshot the run
  captured shows the list with row 0 right under the touch point. The second
  and third specs press and hold the same way seconds later and get their menu
  every time.

=============== FILE: reports/ci-lane-notes.md ===============
# e2e lane, two Mac minis

Nothing else is scheduled on these machines. The lane is:

    checkout -> npm ci -> pod install -> detox build -> detox test

`detox build` has a median of 11m18s. The simulator is booted by the build step
and then nothing touches it at all until `detox test` starts.

Developer laptops run the same lane with the same configuration, except that
the simulator is usually already up and someone has been clicking around in it
for most of the day before anyone runs the specs.

The minis run the stock runner image. Nobody has changed anything on them since
they were set up in March.

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
Subject: [PATCH] reorder: make the history spec reach row 31 and hold it

Four days on this. Green on CI in 6m02s.

I could not find another way to get at a row the list has not rendered, and the
press-and-hold is just unreliable on the minis - it works on the second or
third go, every time. Retrying it is what you do with an unreliable gesture.

--- a/app/OrderHistoryScreen.jsx
+++ b/app/OrderHistoryScreen.jsx
@@ -9,6 +9,9 @@ export default function OrderHistoryScreen({ orders, onOpen, onReorder }) {
       <FlatList
         testID="order-history-list"
         data={sortOrders(orders)}
+        initialNumToRender={100}
+        windowSize={21}
+        removeClippedSubviews={false}
         keyExtractor={(o) => String(o.id)}
         renderItem={({ item }) => <OrderRow order={item} onOpen={onOpen} onReorder={onReorder} />}
       />

--- a/e2e/reorder.test.js
+++ b/e2e/reorder.test.js
@@ -1,3 +1,20 @@
+const PRESS_ATTEMPTS = 5;
+const BETWEEN_MS = 1500;
+
+async function pressAndHold(matcher) {
+  for (let i = 0; i < PRESS_ATTEMPTS; i++) {
+    await element(matcher).longPress();
+    await new Promise((r) => setTimeout(r, BETWEEN_MS));
+    try {
+      await expect(element(by.id('reorder-menu'))).toBeVisible();
+      return;
+    } catch (err) {
+      if (i === PRESS_ATTEMPTS - 1) throw err;
+    }
+  }
+}
+
 describe('Reorder', () => {
   beforeAll(async () => {
     await device.launchApp({ newInstance: true });
@@ -11,17 +28,17 @@ describe('Reorder', () => {
   it('reorders the most recent order', async () => {
-    await element(by.id('order-row')).atIndex(0).longPress();
+    await pressAndHold(by.id('order-row'));
     await element(by.id('reorder-menu-confirm')).tap();
     await expect(element(by.id('cart-count'))).toHaveText('1');
   });

   it('reorders an older order further down the list', async () => {
-    await element(by.id('order-row')).atIndex(30).longPress();
+    await pressAndHold(by.id('order-row'));
     await element(by.id('reorder-menu-confirm')).tap();
     await expect(element(by.id('cart-count'))).toHaveText('2');
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
