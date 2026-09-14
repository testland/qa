package com.northwind.auth

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.closeSoftKeyboard
import androidx.test.espresso.action.ViewActions.typeText
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.hasChildCount
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Before
import org.junit.FixMethodOrder
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.MethodSorters

@RunWith(AndroidJUnit4::class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
class SessionTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(HomeActivity::class.java)

    @Before
    fun wipeSessionPrefs() {
        InstrumentationRegistry.getInstrumentation().targetContext
            .getSharedPreferences("session", 0)
            .edit()
            .clear()
            .commit()
    }

    @Test
    fun a_promptsForNotificationsOnFirstLaunch() {
        onView(withId(R.id.notifications_rationale_card)).check(matches(isDisplayed()))
    }

    @Test
    fun b_showsEmptyRecentSearches() {
        onView(withId(R.id.recent_search_chips)).check(matches(hasChildCount(0)))
    }

    @Test
    fun c_signsInAndRemembersMe() {
        onView(withId(R.id.email_field)).perform(typeText("rosa@northwind.example"), closeSoftKeyboard())
        onView(withId(R.id.password_field)).perform(typeText("hunter2"), closeSoftKeyboard())
        onView(withId(R.id.remember_me)).perform(click())
        onView(withId(R.id.sign_in_button)).perform(click())
        onView(withId(R.id.account_header)).check(matches(isDisplayed()))
    }

    @Test
    fun d_showsRecentSearchesForSignedInUser() {
        onView(withId(R.id.search_field)).perform(typeText("wool socks"), closeSoftKeyboard())
        onView(withId(R.id.search_submit)).perform(click())
        onView(withId(R.id.recent_search_chips)).check(matches(hasChildCount(1)))
    }
}
