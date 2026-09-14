# Nineteen tests are red in the nightly and every one of them passes on its own

## Problem Description

`com.northwind.shop`, Android, Kotlin. Twenty-three instrumentation tests across
four classes. Since 3 September the nightly has been red on nineteen of them.
Karim has been through the list one test at a time on the same emulator image
and every single one passes when he runs it by itself, in nine seconds or less.
Run the whole thing and it takes twenty-two minutes and comes back with nineteen
failures.

There are three theories on the table and I do not have a way to choose between
them.

Rosa wants to pin the execution order. Her argument is that the nightly on the
8th had a different order and a different set of failures, so order is clearly
the variable, and that we should lock in the alphabetical order and move on. She
also says state cannot be the problem because she turned per-test isolation on
back in March and it has been in the build file ever since.

Karim wants to raise the idle timeout to a hundred and twenty seconds. His
argument is that every failure is a timeout, the emulator is slow, and twenty-six
seconds was always a guess.

Tomas thinks it is the onboarding flag. `AccountTest` writes a preference that
the home screen reads, and he has watched it change behaviour on a later screen
by hand.

Attached: the two classes that matter, the idling class, the cart repository and
activity, the module build file, the nightly logs from the 11th and the 8th,
Karim's single-test runs, and the staging gateway log for the 11th.

Work out what is actually leaking, fix it, and tell me which of the three
proposals survives.

## Output Specification

1. Make the full nightly report what the single-test runs report. Keep all
   twenty-three `@Test` methods and do not change what any test asserts.
2. You may change production code under `app/src/main/` and the module build
   file.
3. Write `docs/nightly-isolation.md`: what is leaking between tests, why a test
   run on its own does not see it, and a verdict on each of the three proposals
   with the reason it does or does not hold.

## Input Files

Extract the following files before beginning.

=============== FILE: app/src/androidTest/java/com/northwind/shop/CartTest.kt ===============
package com.northwind.shop

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.IdlingRegistry
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CartTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(CartActivity::class.java)

    @Before
    fun registerIdling() {
        IdlingRegistry.getInstance().register(CartNetworkIdling)
    }

    @Test
    fun showsSeededLines() {
        onView(withId(R.id.cart_line_count)).check(matches(withText("12 items")))
    }

    @Test
    fun showsSubtotal() {
        onView(withId(R.id.cart_subtotal)).check(matches(withText("£167.20")))
    }

    @Test
    fun updatesQuantityInPlace() {
        onView(withId(R.id.qty_increment)).perform(click())
        onView(withId(R.id.cart_subtotal)).check(matches(withText("£171.70")))
        onView(withId(R.id.pending_edit_badge)).check(matches(isDisplayed()))
    }
}

=============== FILE: app/src/androidTest/java/com/northwind/shop/AccountTest.kt ===============
package com.northwind.shop

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AccountTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(AccountActivity::class.java)

    private val prefs = InstrumentationRegistry.getInstrumentation().targetContext
        .getSharedPreferences("northwind", 0)

    @Test
    fun dismissingOnboardingSticks() {
        onView(withId(R.id.onboarding_dismiss)).perform(click())
        assertTrue(prefs.getBoolean("onboarding_seen", false))
    }

    @Test
    fun showsMembershipTier() {
        onView(withId(R.id.tier_label)).check(matches(isDisplayed()))
    }

    @Test
    fun opensAddressBook() {
        onView(withId(R.id.addresses_row)).perform(click())
        onView(withId(R.id.address_list)).check(matches(isDisplayed()))
    }
}

=============== FILE: app/src/main/java/com/northwind/shop/CartNetworkIdling.kt ===============
package com.northwind.shop

import androidx.test.espresso.IdlingResource
import java.util.concurrent.atomic.AtomicInteger

object CartNetworkIdling : IdlingResource {

    private val pending = AtomicInteger(0)
    @Volatile private var callback: IdlingResource.ResourceCallback? = null

    override fun getName(): String = "CartNetworkIdling"

    override fun isIdleNow(): Boolean = pending.get() == 0

    override fun registerIdleTransitionCallback(cb: IdlingResource.ResourceCallback?) {
        callback = cb
    }

    fun increment() {
        pending.incrementAndGet()
    }

    fun decrement() {
        if (pending.decrementAndGet() == 0) callback?.onTransitionToIdle()
    }
}

=============== FILE: app/src/main/java/com/northwind/shop/CartRepository.kt ===============
package com.northwind.shop

import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class CartRepository(private val api: CartApi) {

    private var pendingEdits = false

    fun hasPendingEdits(): Boolean = pendingEdits

    fun changeQuantity(lineId: String, qty: Int) {
        pendingEdits = true
    }

    fun syncPendingChanges() {
        CartNetworkIdling.increment()
        api.sync().enqueue(object : Callback<CartState> {
            override fun onResponse(call: Call<CartState>, response: Response<CartState>) {
                pendingEdits = false
                CartNetworkIdling.decrement()
            }

            override fun onFailure(call: Call<CartState>, t: Throwable) {
                Telemetry.warn("cart sync failed", t)
            }
        })
    }
}

=============== FILE: app/src/main/java/com/northwind/shop/CartActivity.kt ===============
package com.northwind.shop

import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle

class CartActivity : AppCompatActivity() {

    private lateinit var repository: CartRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_cart)
        repository = CartRepository(Api.cart)
        findViewById<android.view.View>(R.id.qty_increment).setOnClickListener {
            repository.changeQuantity("line-1", 2)
            render()
        }
    }

    override fun onPause() {
        super.onPause()
        if (repository.hasPendingEdits()) repository.syncPendingChanges()
    }

    private fun render() = Unit
}

=============== FILE: app/build.gradle ===============
plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.northwind.shop'
    compileSdk 35

    defaultConfig {
        applicationId "com.northwind.shop"
        minSdk 24
        targetSdk 35
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        testInstrumentationRunnerArguments clearPackageData: 'true' // per-test isolation, 2026-03-11
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.7.0'
    implementation 'com.squareup.retrofit2:retrofit:2.11.0'
    implementation 'androidx.test.espresso:espresso-idling-resource:3.6.1'

    androidTestImplementation 'androidx.test.ext:junit:1.2.1'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.6.1'
    androidTestImplementation 'androidx.test:rules:1.6.1'
}

=============== FILE: reports/nightly-4712.txt ===============
### Nightly 4712 - 2026-09-11, Pixel 4a emulator API 34, 22m 14s
### Every line below was emitted by pid 7402.

com.northwind.shop.CartTest > showsSeededLines PASSED (3.1s)
com.northwind.shop.CartTest > showsSubtotal PASSED (2.8s)
com.northwind.shop.CartTest > updatesQuantityInPlace PASSED (4.0s)

com.northwind.shop.AccountTest > dismissingOnboardingSticks FAILED
androidx.test.espresso.IdlingResourceTimeoutException: Wait for [CartNetworkIdling] to become idle timed out
    at androidx.test.espresso.base.UiControllerImpl.loopUntil(UiControllerImpl.java:472)
    elapsed: 26.0s

com.northwind.shop.AccountTest > showsMembershipTier FAILED
androidx.test.espresso.IdlingResourceTimeoutException: Wait for [CartNetworkIdling] to become idle timed out
    elapsed: 26.0s

com.northwind.shop.AccountTest > opensAddressBook FAILED
androidx.test.espresso.IdlingResourceTimeoutException: Wait for [CartNetworkIdling] to become idle timed out
    elapsed: 26.0s

com.northwind.shop.SearchTest - 8 tests, 0 passed, 8 failed
  all eight: IdlingResourceTimeoutException: Wait for [CartNetworkIdling] to become idle timed out

com.northwind.shop.OrdersTest - 9 tests, 0 passed, 9 failed
  all nine: IdlingResourceTimeoutException: Wait for [CartNetworkIdling] to become idle timed out

23 tests, 4 passed, 19 failed

=============== FILE: reports/nightly-4698.txt ===============
### Nightly 4698 - 2026-09-08, same image, 23m 02s, pid 7188 throughout
### The runner reported CartTest's methods in a different order that night.

com.northwind.shop.CartTest > updatesQuantityInPlace PASSED (4.1s)

com.northwind.shop.CartTest > showsSeededLines FAILED
androidx.test.espresso.IdlingResourceTimeoutException: Wait for [CartNetworkIdling] to become idle timed out
    elapsed: 26.0s

com.northwind.shop.CartTest > showsSubtotal FAILED
androidx.test.espresso.IdlingResourceTimeoutException: Wait for [CartNetworkIdling] to become idle timed out
    elapsed: 26.0s

com.northwind.shop.AccountTest - 3 tests, 0 passed, 3 failed (same exception)
com.northwind.shop.SearchTest - 8 tests, 0 passed, 8 failed (same exception)
com.northwind.shop.OrdersTest - 9 tests, 0 passed, 9 failed (same exception)

23 tests, 1 passed, 22 failed

=============== FILE: reports/single-runs.txt ===============
### Karim, 2026-09-12. Each command run on a freshly booted emulator.

./gradlew connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.northwind.shop.AccountTest#dismissingOnboardingSticks
  -> 1 test, 1 passed (6.2s)

./gradlew connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.northwind.shop.SearchTest
  -> 8 tests, 8 passed (41s)

./gradlew connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.northwind.shop.OrdersTest
  -> 9 tests, 9 passed (52s)

./gradlew connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.northwind.shop.CartTest
  -> 3 tests, 3 passed (11s)

Ran the last one four times. Green on three of them. On the fourth the runner
reported the methods in a different order and two of the three failed with the
same timeout exception the nightly shows.

=============== FILE: reports/gateway-2026-09-11.txt ===============
### staging gateway, 2026-09-11 02:00-02:25, requests from the CI emulator

GET  /v1/cart              200   x 6      avg 210 ms
GET  /v1/account/tier      200   x 3      avg 140 ms
POST /v1/cart/sync         503   x 1      42 ms      upstream cart-writer unavailable
GET  /v1/search            200   x 8      avg 260 ms
GET  /v1/orders            200   x 9      avg 300 ms

Note from platform: cart-writer has been down in staging since 2026-09-02 and is
not scheduled to come back until the queue migration finishes. Reads are fine.
