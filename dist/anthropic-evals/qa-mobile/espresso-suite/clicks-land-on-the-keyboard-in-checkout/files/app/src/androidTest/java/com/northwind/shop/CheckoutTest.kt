package com.northwind.shop

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.closeSoftKeyboard
import androidx.test.espresso.action.ViewActions.typeText
import androidx.test.espresso.assertion.ViewAssertions.doesNotExist
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.contrib.RecyclerViewActions
import androidx.test.espresso.matcher.ViewMatchers.hasDescendant
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CheckoutTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(CheckoutActivity::class.java)

    @Test
    fun emailFieldAcceptsPlusAddressing() {
        onView(withId(R.id.email_field))
            .perform(typeText("dana+shop@northwind.test"), closeSoftKeyboard())
        onView(withId(R.id.continue_button)).perform(click())
        onView(withId(R.id.delivery_heading)).check(matches(isDisplayed()))
    }

    @Test
    fun removingAnItemUpdatesTheCart() {
        onView(withId(R.id.cart_list)).perform(
            RecyclerViewActions.actionOnItem<CartAdapter.Row>(
                hasDescendant(withText("Cold Brew Carafe")), click()
            )
        )
        onView(withId(R.id.remove_item_button)).perform(click())
        onView(withText("Cold Brew Carafe")).check(doesNotExist())
    }

    @Test
    fun expiredPromoCodeIsRejected() {
        onView(withId(R.id.promo_field)).perform(typeText("SPRING24"), closeSoftKeyboard())
        onView(withId(R.id.apply_promo_button)).perform(click())
        onView(withId(R.id.promo_error_container)).check(matches(isDisplayed()))
    }

    @Test
    fun placeOrderButtonIsReachableOnASmallScreen() {
        onView(withId(R.id.notes_field)).perform(typeText("leave at door"), closeSoftKeyboard())
        Thread.sleep(2000)
        onView(withId(R.id.place_order_button)).perform(click())
        onView(withId(R.id.order_confirmation)).check(matches(isDisplayed()))
    }

    @Ignore("unstable since the keyboard work - NW-2291")
    @Test
    fun deliveryDateAppearsAfterAddressEntry() {
        onView(withId(R.id.postcode_field)).perform(typeText("EC1A 1BB"), closeSoftKeyboard())
        onView(withId(R.id.continue_button)).perform(click())
        onView(withId(R.id.delivery_date)).check(matches(withText("Thu 18 Sep")))
    }
}
