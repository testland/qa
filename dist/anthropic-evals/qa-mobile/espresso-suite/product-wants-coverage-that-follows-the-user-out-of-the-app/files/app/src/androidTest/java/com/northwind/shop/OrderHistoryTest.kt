package com.northwind.shop

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.hasDescendant
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class OrderHistoryTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(OrderHistoryActivity::class.java)

    @Test
    fun showsMostRecentOrderFirst() {
        onView(withId(R.id.order_row_0))
            .check(matches(hasDescendant(withText("NW-11987"))))
    }
}
