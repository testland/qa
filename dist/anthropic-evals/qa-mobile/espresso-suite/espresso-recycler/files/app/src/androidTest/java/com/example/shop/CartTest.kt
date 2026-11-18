package com.example.shop

import androidx.test.espresso.Espresso.onData
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.*
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CartTest {
    @get:Rule val rule = ActivityScenarioRule(ProductListActivity::class.java)

    @Test fun addTrailShoesToCart() {
        Thread.sleep(3000) // wait for the products API
        onData(withText("Trail Shoes")).perform(click())
        onView(withId(R.id.add_to_cart)).perform(click())
        Thread.sleep(1000) // snackbar animation
        onView(withText("Added to cart")).check(matches(isDisplayed()))
    }
}
