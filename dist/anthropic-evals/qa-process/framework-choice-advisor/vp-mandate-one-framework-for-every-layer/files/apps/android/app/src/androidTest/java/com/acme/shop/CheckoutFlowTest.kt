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
