# Nineteen specs went red the Monday we shipped German

## Problem Description

We shipped `de-DE` and `ar-EG` alongside `en-US` on Monday. The app is fine.
The end-to-end suite is not: on a simulator set to German, 19 of our 26 specs
fail. On `en-US` they are all green, same build, same binary. Arabic is worse.

Rasmus was contracting with us through August and sent a patch on his last day.
It imports our translation catalogue into the spec files and looks every string
up through it, so a German run asks the catalogue for the German string. I ran
it: German goes from 19 failures to 2, Arabic from 21 to 3. It is the only
thing anyone has produced, it is clever, and it is queued to merge on Friday.
If it should not go in I need something concrete to say, because "this feels
wrong" is not going to beat a patch that turns 19 red specs green.

Two other things you should know before you answer.

Marketing are rewriting the catalogue copy this quarter. "Add to cart" becomes
"Add to basket" in October, in all three locales, and the checkout wording is
being shortened at the same time.

And there are two specs that have been failing on the Android emulator for
about a month, in English, on the same build that is green on the iOS
simulator. We shelved them as "an Android thing" and stopped looking. They are
in the attached run summary. Sort those out too while you are in the file.

The two spec files, the components they touch, the run summary, Rasmus's patch
and the changelog for the date-picker package we use are attached. Our money
formatter and its unit tests are there because one of the failures is about a
price string.

## Output Specification

1. Make `e2e/catalogue.test.js` and `e2e/checkout.test.js` green on all three
   locales and on both platforms. Do not change which behaviour a spec checks.
2. Change files under `app/` if your fix needs it.
3. Write `docs/suite-locale-decision.md`: your verdict on Rasmus's patch with
   the reasoning, the rule you want the team to follow instead, and your
   explanation of the two long-standing Android failures.

## Input Files

Extract the following files before beginning.

=============== FILE: e2e/catalogue.test.js ===============
describe('Catalogue', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('adds a product to the cart from the product card', async () => {
    await element(by.text('Barista Oat Milk 1L')).tap();
    await element(by.text('Add to cart')).tap();
    await expect(element(by.label('Cart'))).toBeVisible();
  });

  it('shows the organic badge on organic products', async () => {
    await element(by.text('Barista Oat Milk 1L')).tap();
    await expect(element(by.type('RCTImageView')).atIndex(1)).toBeVisible();
  });

  it('shows an out-of-stock notice', async () => {
    await element(by.text('Seasonal Figs 250g')).tap();
    await expect(element(by.text('Out of stock'))).toBeVisible();
  });
});

=============== FILE: e2e/checkout.test.js ===============
describe('Checkout', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('shows the subtotal for a single line', async () => {
    await element(by.text('Barista Oat Milk 1L')).tap();
    await element(by.text('Add to cart')).tap();
    await element(by.text('Checkout')).tap();
    await expect(element(by.text('$4.99'))).toBeVisible();
  });

  it('lets the shopper pick a delivery date', async () => {
    await element(by.text('Checkout')).tap();
    await element(by.label('Delivery date')).tap();
    await expect(element(by.type('RCTImageView')).atIndex(0)).toBeVisible();
  });
});

=============== FILE: app/ProductCard.jsx ===============
import React from 'react';
import { TouchableOpacity, Text, Image, View } from 'react-native';
import { useTranslation } from '../src/i18n';

export default function ProductCard({ product, onAdd }) {
  const { t } = useTranslation();

  return (
    <View>
      <TouchableOpacity onPress={() => onAdd(product.sku)}>
        <Text>{product.name}</Text>
      </TouchableOpacity>

      {product.organic ? (
        <Image source={require('../assets/organic-badge.png')} accessibilityLabel={t('badge.organic')} />
      ) : null}

      {product.inStock ? (
        <TouchableOpacity onPress={() => onAdd(product.sku)}>
          <Text>{t('catalogue.addToCart')}</Text>
        </TouchableOpacity>
      ) : (
        <Text>{t('catalogue.outOfStock')}</Text>
      )}
    </View>
  );
}

=============== FILE: app/CartTabButton.jsx ===============
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useTranslation } from '../src/i18n';

export default function CartTabButton({ count, onPress }) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity onPress={onPress} accessibilityLabel={t('nav.cart')}>
      <Text>{t('nav.cart')}</Text>
      <Text>{count}</Text>
    </TouchableOpacity>
  );
}

=============== FILE: app/CartScreen.jsx ===============
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import SubtotalRow from './SubtotalRow';
import { useTranslation } from '../src/i18n';

export default function CartScreen({ subtotalCents, onCheckout }) {
  const { t } = useTranslation();

  return (
    <View>
      <SubtotalRow cents={subtotalCents} />
      <TouchableOpacity onPress={onCheckout}>
        <Text>{t('cart.checkout')}</Text>
      </TouchableOpacity>
    </View>
  );
}

=============== FILE: app/SubtotalRow.jsx ===============
import React from 'react';
import { View, Text } from 'react-native';
import { formatMoney } from '../src/format-money';
import { useTranslation } from '../src/i18n';

export default function SubtotalRow({ cents }) {
  const { t, locale } = useTranslation();

  return (
    <View>
      <Text>{t('checkout.subtotal')}</Text>
      <Text>{formatMoney(cents, locale)}</Text>
    </View>
  );
}

=============== FILE: app/DeliveryDateField.jsx ===============
import React from 'react';
import { View, Image } from 'react-native';
import NativeDateTimePicker from '@vendor/rn-datetime';
import { useTranslation } from '../src/i18n';

export default function DeliveryDateField({ value, onChange }) {
  const { t, locale } = useTranslation();

  return (
    <View>
      <View>
        <NativeDateTimePicker
          mode="date"
          locale={locale}
          value={value}
          onChange={onChange}
          accessibilityLabel={t('checkout.deliveryDate')}
        />
      </View>

      {value ? (
        <Image
          source={require('../assets/date-confirmed.png')}
          accessibilityLabel={t('checkout.dateChosen')}
        />
      ) : null}
    </View>
  );
}

=============== FILE: node_modules/@vendor/rn-datetime/CHANGELOG.md ===============
# @vendor/rn-datetime changelog

## 3.1.2 - 2026-04-30
- Fix: Android 15 edge-to-edge insets on the spinner variant.

## 3.1.0 - 2025-09-18
- Add `minimumDate` / `maximumDate`.

## 3.0.0 - 2024-11-04 (breaking)
- The JS component is now a thin bridge over the platform picker rather than a
  re-implementation of it. Props reach the native view through an explicit
  allow-list: `mode`, `locale`, `value`, `minimumDate`, `maximumDate`,
  `onChange`, `accessible`, `accessibilityLabel`, `style`. Every other prop is
  dropped in the bridge and never reaches the native side. This is deliberate -
  2.x forwarded unknown props and crashed on Android 13.
- `theme` is removed; style the surrounding view instead.

## 2.4.1 - 2024-03-02
- Fix: onChange fired twice on iOS when dismissed by tapping outside.

=============== FILE: reports/locale-and-platform-runs.md ===============
# Suite results by locale and platform, build 2.4.0

| Run                       | Green | Red |
|---------------------------|-------|-----|
| iOS simulator, en-US      | 26    | 0   |
| iOS simulator, de-DE      | 7     | 19  |
| iOS simulator, ar-EG      | 5     | 21  |
| Android emulator, en-US   | 24    | 2   |
| Android emulator, de-DE   | 5     | 21  |

## Representative German output, iOS simulator

```
FAIL e2e/catalogue.test.js
  x adds a product to the cart from the product card
      Test Failed: No elements found for "TEXT == "Add to cart""
         (the button reads "In den Warenkorb")
  x shows an out-of-stock notice
      Test Failed: No elements found for "TEXT == "Out of stock""
         (the screen shows "Nicht vorraetig")

FAIL e2e/checkout.test.js
  x shows the subtotal for a single line
      Test Failed: No elements found for "TEXT == "$4.99""
         (the screen shows "4,99 EUR-sign")
  x lets the shopper pick a delivery date
      Test Failed: No elements found for "LABEL == "Delivery date""
         (the accessibility label is "Lieferdatum")
```

## The 2 long-standing failures - English, both platforms, same build

```
FAIL e2e/catalogue.test.js
  x shows the organic badge on organic products
      Test Failed: No elements found for "CLASS == "RCTImageView""

FAIL e2e/checkout.test.js
  x lets the shopper pick a delivery date
      Test Failed: No elements found for "CLASS == "RCTImageView""
```

Same two specs, green on iOS, red on Android, every run since 2026-08-11.
Nobody has opened a ticket.

=============== FILE: patches/i18n-lookup.diff ===============
From: Rasmus Holm <rasmus@contractor.example>
Subject: [PATCH] e2e: resolve spec strings through the translation catalogue

German: 19 failures -> 2. Arabic: 21 -> 3. The remainder are the Android
class-name ones, which are a separate problem.

--- a/e2e/catalogue.test.js
+++ b/e2e/catalogue.test.js
@@ -1,4 +1,7 @@
+const { t, setLocale } = require('../src/i18n');
+
 describe('Catalogue', () => {
+  beforeAll(() => setLocale(process.env.E2E_LOCALE || 'en-US'));
+
   beforeEach(async () => {
     await device.reloadReactNative();
   });
@@ -7,8 +10,8 @@
   it('adds a product to the cart from the product card', async () => {
     await element(by.text('Barista Oat Milk 1L')).tap();
-    await element(by.text('Add to cart')).tap();
-    await expect(element(by.label('Cart'))).toBeVisible();
+    await element(by.text(t('catalogue.addToCart'))).tap();
+    await expect(element(by.label(t('nav.cart')))).toBeVisible();
   });

@@ -17,7 +20,7 @@
   it('shows an out-of-stock notice', async () => {
     await element(by.text('Seasonal Figs 250g')).tap();
-    await expect(element(by.text('Out of stock'))).toBeVisible();
+    await expect(element(by.text(t('catalogue.outOfStock')))).toBeVisible();
   });
 });

--- a/e2e/checkout.test.js
+++ b/e2e/checkout.test.js
@@ -1,4 +1,8 @@
+const { t, setLocale } = require('../src/i18n');
+const { formatMoney } = require('../src/format-money');
+const LOCALE = process.env.E2E_LOCALE || 'en-US';
+
 describe('Checkout', () => {
+  beforeAll(() => setLocale(LOCALE));
+
   beforeEach(async () => {
     await device.reloadReactNative();
   });
@@ -8,9 +12,9 @@
   it('shows the subtotal for a single line', async () => {
     await element(by.text('Barista Oat Milk 1L')).tap();
-    await element(by.text('Add to cart')).tap();
-    await element(by.text('Checkout')).tap();
-    await expect(element(by.text('$4.99'))).toBeVisible();
+    await element(by.text(t('catalogue.addToCart'))).tap();
+    await element(by.text(t('cart.checkout'))).tap();
+    await expect(element(by.text(formatMoney(499, LOCALE)))).toBeVisible();
   });

   it('lets the shopper pick a delivery date', async () => {
-    await element(by.text('Checkout')).tap();
-    await element(by.label('Delivery date')).tap();
+    await element(by.text(t('cart.checkout'))).tap();
+    await element(by.label(t('checkout.deliveryDate'))).tap();
     await expect(element(by.type('RCTImageView')).atIndex(0)).toBeVisible();
   });
 });

=============== FILE: src/format-money.js ===============
'use strict';

const SPACES = /[   ]/g;

const CURRENCY_BY_LOCALE = { 'en-US': 'USD', 'de-DE': 'EUR', 'ar-EG': 'EGP' };

function currencyFor(locale) {
  const c = CURRENCY_BY_LOCALE[locale];
  if (!c) throw new RangeError(`no currency configured for ${locale}`);
  return c;
}

function formatMoney(cents, locale) {
  const nf = new Intl.NumberFormat(locale, { style: 'currency', currency: currencyFor(locale) });
  return nf.format(cents / 100).replace(SPACES, ' ');
}

function isRtl(locale) {
  return ['ar', 'he', 'fa', 'ur'].includes(String(locale).split('-')[0]);
}

module.exports = { CURRENCY_BY_LOCALE, currencyFor, formatMoney, isRtl };

=============== FILE: test/format-money.test.js ===============
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { currencyFor, formatMoney, isRtl } = require('../src/format-money.js');

test('each shipped locale has a currency', () => {
  assert.equal(currencyFor('en-US'), 'USD');
  assert.equal(currencyFor('de-DE'), 'EUR');
  assert.equal(currencyFor('ar-EG'), 'EGP');
});

test('an unconfigured locale is rejected rather than guessed', () => {
  assert.throws(() => currencyFor('fr-CA'), RangeError);
});

test('the US subtotal keeps a leading dollar sign', () => {
  assert.equal(formatMoney(499, 'en-US'), '$4.99');
});

test('the German subtotal uses a comma and a trailing euro sign', () => {
  const s = formatMoney(499, 'de-DE');
  assert.match(s, /^4,99 /);
  assert.ok(s.includes('€'));
});

test('Arabic is recognised as right-to-left', () => {
  assert.equal(isRtl('ar-EG'), true);
  assert.equal(isRtl('de-DE'), false);
});
