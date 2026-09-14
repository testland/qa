package com.northwind.pay

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.typeText
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CheckoutFlowTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(CheckoutActivity::class.java)

    @Test
    fun showsEmptyCartMessage() {
        onView(withId(R.id.empty_cart_message)).check(matches(isDisplayed()))
    }

    @Test
    fun appliesPromoCode() {
        onView(withId(R.id.promo_field)).perform(typeText("WELCOME10"))
        onView(withId(R.id.apply_button)).perform(click())
        onView(withId(R.id.subtotal)).check(matches(withText("22.49 USD")))
    }

    @Test
    fun placesOrderWithSavedCard() {
        onView(withId(R.id.saved_card_visa)).perform(click())
        onView(withId(R.id.place_order_button)).perform(click())
        onView(withId(R.id.order_confirmation)).check(matches(isDisplayed()))
    }
}
