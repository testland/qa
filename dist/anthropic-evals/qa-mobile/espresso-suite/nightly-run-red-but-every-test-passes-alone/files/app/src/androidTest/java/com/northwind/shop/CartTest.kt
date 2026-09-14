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
