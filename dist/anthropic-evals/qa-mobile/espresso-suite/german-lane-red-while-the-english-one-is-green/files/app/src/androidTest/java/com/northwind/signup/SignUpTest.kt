package com.northwind.signup

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.closeSoftKeyboard
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
class SignUpTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(SignUpActivity::class.java)

    @Test
    fun showsPasswordStrengthMeter() {
        onView(withId(R.id.password_field)).perform(typeText("hunter2"), closeSoftKeyboard())
        onView(withId(R.id.strength_meter)).check(matches(isDisplayed()))
    }

    @Test
    fun rejectsShortPassword() {
        onView(withId(R.id.password_field)).perform(typeText("abc"), closeSoftKeyboard())
        onView(withId(R.id.password_error)).check(matches(isDisplayed()))
    }

    @Test
    fun continuesFromEmailStep() {
        onView(withId(R.id.email_field)).perform(typeText("steve@northwind.example"), closeSoftKeyboard())
        onView(withText("Continue")).perform(click())
        onView(withId(R.id.password_step)).check(matches(isDisplayed()))
    }

    @Test
    fun createsAccount() {
        onView(withId(R.id.email_field)).perform(typeText("steve@northwind.example"), closeSoftKeyboard())
        onView(withText("Continue")).perform(click())
        onView(withId(R.id.password_field)).perform(typeText("correcthorsebattery"), closeSoftKeyboard())
        onView(withText("Create account")).perform(click())
        onView(withId(R.id.confirmation_root)).check(matches(isDisplayed()))
    }

    @Test
    fun greetsTheNewUserByName() {
        onView(withId(R.id.first_name_field)).perform(typeText("Steve"), closeSoftKeyboard())
        onView(withText("Continue")).perform(click())
        onView(withId(R.id.greeting)).check(matches(withText("Welcome, Steve")))
    }

    @Test
    fun showsFirstYearTotalOnConfirmation() {
        onView(withId(R.id.plan_annual)).perform(click())
        onView(withId(R.id.first_year_total)).check(matches(withText("$22.49")))
    }
}
