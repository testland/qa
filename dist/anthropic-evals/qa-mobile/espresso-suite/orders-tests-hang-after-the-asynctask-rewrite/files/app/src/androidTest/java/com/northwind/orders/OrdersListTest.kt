package com.northwind.orders

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
class OrdersListTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(OrdersActivity::class.java)

    private lateinit var idling: NetworkIdlingResource

    @Before
    fun setUp() {
        idling = NetworkIdlingResource()
        IdlingRegistry.getInstance().register(idling)
    }

    @Test
    fun showsEmptyStateForNewAccount() {
        onView(withId(R.id.empty_orders_message)).check(matches(isDisplayed()))
    }

    @Test
    fun loadsOrdersForReturningCustomer() {
        onView(withId(R.id.order_row_0)).check(matches(isDisplayed()))
    }

    @Test
    fun showsRefundBadgeOnRefundedOrder() {
        onView(withId(R.id.order_row_2)).perform(click())
        onView(withId(R.id.status_badge)).check(matches(withText("Refunded")))
    }
}
