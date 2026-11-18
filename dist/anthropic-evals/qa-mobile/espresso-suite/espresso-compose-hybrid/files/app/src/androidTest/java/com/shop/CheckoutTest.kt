package com.shop

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.*
import androidx.test.ext.junit.rules.ActivityScenarioRule
import org.junit.Rule
import org.junit.Test

class CheckoutTest {
    @get:Rule val rule = ActivityScenarioRule(CheckoutActivity::class.java)

    @Test fun paysAndShowsConfirmation() {
        onView(withId(R.id.total)).check(matches(withText("€12.00")))       // still a classic View
        onView(withText("€12.00")).check(matches(isDisplayed()))             // the price inside the Pay button
        onView(withText("Pay now")).perform(click())                          // NoMatchingViewException since the Compose migration
        Thread.sleep(2000)
        onView(withText("Payment confirmed")).check(matches(isDisplayed()))
    }
}
