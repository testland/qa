package com.northwind.shop

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
import androidx.test.platform.app.InstrumentationRegistry
import java.util.Locale
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class SignupFlowDeTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(SignupActivity::class.java)

    private val context = InstrumentationRegistry.getInstrumentation().targetContext

    @Before
    fun useGerman() {
        Locale.setDefault(Locale.GERMANY)
    }

    @Test
    fun signupHeadingIsGerman() {
        onView(withId(R.id.signup_heading)).check(matches(withText("Konto erstellen")))
    }

    @Test
    fun continueButtonAdvancesToDelivery() {
        onView(withId(R.id.email_field)).perform(typeText("dana@northwind.test"), closeSoftKeyboard())
        onView(withText("Weiter")).perform(click())
        onView(withId(R.id.delivery_heading)).check(matches(isDisplayed()))
    }

    @Test
    fun emailValidationMessageIsGerman() {
        onView(withId(R.id.email_field)).perform(typeText("not-an-email"), closeSoftKeyboard())
        onView(withId(R.id.continue_button)).perform(click())
        onView(withId(R.id.email_error)).check(matches(withText("Bitte gib eine gultige E-Mail-Adresse ein")))
    }

    @Test
    fun cartTotalIsFormattedForTheLocale() {
        onView(withId(R.id.cart_tab)).perform(click())
        onView(withId(R.id.cart_total)).check(matches(withText("1.234,56 EUR")))
    }

    @Test
    fun germanTranslationsAreLoaded() {
        onView(withId(R.id.signup_heading))
            .check(matches(withText(context.getString(R.string.signup_heading))))
    }

    @Test
    fun postcodeFieldAcceptsGermanFormat() {
        onView(withId(R.id.postcode_field)).perform(typeText("10115"), closeSoftKeyboard())
        onView(withId(R.id.postcode_field)).check(matches(withText("10115")))
    }

    @Test
    fun signupSucceedsWithValidDetails() {
        onView(withId(R.id.email_field)).perform(typeText("neu@northwind.test"), closeSoftKeyboard())
        onView(withId(R.id.password_field)).perform(typeText("hunter2hunter2"), closeSoftKeyboard())
        onView(withId(R.id.continue_button)).perform(click())
        onView(withId(R.id.delivery_heading)).check(matches(isDisplayed()))
    }

    @Test
    fun privacyLinkOpensPolicy() {
        onView(withId(R.id.privacy_link)).perform(click())
        onView(withId(R.id.policy_body)).check(matches(isDisplayed()))
    }

    @Test
    fun errorBannerShownOnDuplicateEmail() {
        onView(withId(R.id.email_field)).perform(typeText("dana@northwind.test"), closeSoftKeyboard())
        onView(withId(R.id.password_field)).perform(typeText("hunter2hunter2"), closeSoftKeyboard())
        onView(withId(R.id.continue_button)).perform(click())
        onView(withId(R.id.error_banner)).check(matches(withText("Diese E-Mail-Adresse ist bereits registriert")))
    }
}
