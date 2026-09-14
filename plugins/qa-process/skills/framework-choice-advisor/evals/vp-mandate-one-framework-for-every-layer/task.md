# One test tool for the whole company by Q1 - I need the name and the bill

## Problem Description

I am chief of staff to our VP of Engineering. She has committed to the exec
team that by the end of Q1 2027 we run **one** test automation tool across the
company, not four. Her reasoning is that we currently pay for four sets of
training, four sets of CI plugins and four hiring profiles, and that when the
mobile team is under water nobody from web can help them, which she has now
watched happen twice.

Our contractor Marek, who built the Android suite and is with us until
19 December, says WebdriverIO drives browsers and mobile devices from a single
runner and that he has shipped exactly this consolidation at two other
companies. That makes it the leading candidate as far as she is concerned, and
frankly he is the only person here who has done a migration of this size. His
memo is attached.

What is in the monorepo today is attached too: the web app, the Android app,
the billing API's test module, the load scripts and the shared unit suite.

What she wants from you is the tool, the migration cost in engineer-weeks per
area, and an honest list of what we give up. She is not looking for a survey.
She has heard "it depends" from three consultancies, and the reason she is
asking an engineer instead is that she wants a position, with numbers, that she
can defend in the January board pack.

Team shapes, since the cost question needs them: web 6 engineers (TypeScript),
Android 3 (Kotlin), billing 4 (Java), plus a two-person platform group who own
CI and the load scripts. Nobody is being hired before March, and the Android
team has an App Store release every fortnight that cannot slip.

## Output Specification

1. Write `docs/consolidation-response.md` — the answer she takes into the board
   pack, including per-area migration cost in engineer-weeks and what is lost.
2. Write `docs/tooling-by-area.md` — a table of what each area runs once your
   answer is applied, one row per area, naming the tool for that area.
3. Do not modify the attached sources.

## Input Files

Extract the following files before beginning.

=============== FILE: apps/web/package.json ===============
{
  "name": "@acme/web",
  "version": "7.3.0",
  "private": true,
  "scripts": {
    "test": "node --test",
    "e2e": "playwright test",
    "e2e:ci": "playwright test --shard=$SHARD"
  },
  "devDependencies": {
    "@playwright/test": "1.47.2",
    "typescript": "5.6.2"
  }
}

=============== FILE: apps/web/playwright.config.ts ===============
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  trace: 'on-first-retry',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});

=============== FILE: apps/web/src/discount.js ===============
function applyDiscount(cents, percent) {
  if (percent < 0 || percent > 100) throw new RangeError('percent out of range');
  return cents - Math.round((cents * percent) / 100);
}

module.exports = { applyDiscount };

=============== FILE: apps/web/tests/unit/discount.test.js ===============
const test = require('node:test');
const assert = require('node:assert/strict');
const { applyDiscount } = require('../../src/discount.js');

test('a ten percent discount comes off the total', () => {
  assert.equal(applyDiscount(1000, 10), 900);
});

test('a hundred percent discount leaves nothing', () => {
  assert.equal(applyDiscount(1000, 100), 0);
});

test('an out-of-range percent is rejected', () => {
  assert.throws(() => applyDiscount(1000, 140), RangeError);
});

=============== FILE: apps/android/app/build.gradle.kts ===============
plugins {
    id("com.android.application")
    kotlin("android")
}

android {
    namespace = "com.acme.shop"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.acme.shop"
        minSdk = 26
        targetSdk = 35
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
}

dependencies {
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
}

=============== FILE: apps/android/app/src/androidTest/java/com/acme/shop/CheckoutFlowTest.kt ===============
package com.acme.shop

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import org.junit.Rule
import org.junit.Test

class CheckoutFlowTest {
    @get:Rule
    val rule = ActivityScenarioRule(MainActivity::class.java)

    @Test
    fun addingAnItemUpdatesTheBadge() {
        onView(withId(R.id.add_to_cart)).perform(click())
        onView(withId(R.id.cart_badge)).check(matches(withText("1")))
    }

    @Test
    fun checkoutShowsTheOrderTotal() {
        onView(withId(R.id.add_to_cart)).perform(click())
        onView(withId(R.id.checkout)).perform(click())
        onView(withId(R.id.order_total)).check(matches(withText("25.00")))
    }
}

=============== FILE: services/billing/pom.xml ===============
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.acme</groupId>
  <artifactId>billing</artifactId>
  <version>3.4.0</version>
  <dependencies>
    <dependency>
      <groupId>io.rest-assured</groupId>
      <artifactId>rest-assured</artifactId>
      <version>5.5.0</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.11.0</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
</project>

=============== FILE: services/billing/src/test/java/com/acme/billing/InvoiceApiTest.java ===============
package com.acme.billing;

import io.restassured.RestAssured;
import org.junit.jupiter.api.Test;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

class InvoiceApiTest {

    @Test
    void invoiceIsReturnedWithItsTotal() {
        RestAssured.baseURI = System.getenv("BILLING_BASE_URI");
        given()
            .header("Authorization", "Bearer " + System.getenv("BILLING_TOKEN"))
        .when()
            .get("/invoices/inv_2211")
        .then()
            .statusCode(200)
            .body("totalCents", equalTo(2500));
    }
}

=============== FILE: perf/checkout-load.js ===============
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const url = __ENV.BASE_URL + '/api/checkout';
  const res = http.post(url, JSON.stringify({ sku: 'SKU-1' }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}

=============== FILE: notes/marek-consolidation-memo.md ===============
# Consolidation memo - M. Nowak, contractor - 2026-09-04

One runner, everything on it. I have done this twice before.

- Web: straightforward. The specs port over; the locator API differs but the
  shape is the same.
- Android: drive the app through the mobile driver instead of the in-process
  instrumentation. Same taps, same assertions.
- Billing API: the runner can issue HTTP requests, so the Java tests can be
  rewritten as request specs in TypeScript and the billing team stops needing
  its own toolchain.
- Load: the runner can loop requests under concurrency. It is not a dedicated
  load tool, but it would remove the fourth stack.

Estimate: one quarter with two people. I am here until 19 December and would
want to start with the web port.

=============== FILE: notes/ci-inventory-2026-09.md ===============
# What CI runs today, per area

| Area    | Job                     | Median wall-clock | Owner    |
|---------|-------------------------|-------------------|----------|
| web     | e2e, 4 shards           | 8 min             | web      |
| web     | unit (node --test)      | 40 s              | web      |
| android | instrumentation, 2 devices | 14 min         | android  |
| billing | api integration         | 6 min             | billing  |
| perf    | nightly load            | 9 min             | platform |

The Android instrumentation job runs on emulators in CI and on two physical
devices in the pre-release gate. It has not been quarantined or skipped in the
last 90 days.
