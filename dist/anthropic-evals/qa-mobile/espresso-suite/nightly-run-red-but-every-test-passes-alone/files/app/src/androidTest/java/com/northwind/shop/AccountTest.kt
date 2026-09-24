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
