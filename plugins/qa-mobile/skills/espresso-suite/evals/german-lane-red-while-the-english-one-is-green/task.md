# The German lane has been red since the day we added it and the English one never has

## Problem Description

`com.northwind.shop`, Android, Kotlin. We open in Germany on 6 October. Three
weeks ago we added a second instrumentation lane so the German build gets the
same nightly coverage the English one has had for two years.

The English lane is 9 for 9 every night. The German lane has failed the same
five tests every night since it was created and has never once been green.
Nobody has had time to look properly because we have all been on launch work.

Miriam's view is that the lane is the problem: "we threw it together in an
afternoon, the selectors in it are brittle, put ids on everything and let's move
on." Hendrik wants to switch the lane off until after launch on the grounds that
a job nobody trusts is worse than no job. The freeze is Friday and I have to
tell them something on Thursday morning.

Attached: the German test class, the two string files, the price formatter and
the application class, the in-app language setting, the CI workflow that launches
both lanes, and the nightly logs from the 8th and the 11th - the class order
differs between those two nights because we added a shard.

Work out what is actually happening and put the lane in a state where its result
means something. I would rather be told the lane cannot tell us what we hoped
than be handed a green one.

## Output Specification

1. Change whatever needs changing in the supplied files. Keep all nine `@Test`
   methods in `SignupFlowDeTest` and do not delete the lane.
2. Write `docs/de-lane-findings.md`: go through the nine tests, say what each
   one's current result is worth, and say what you changed.
3. In the same document, say what you are telling Miriam and Hendrik on
   Thursday, including anything the lane will still not be covering on Friday.

## Input Files

Extract the following files before beginning.

=============== FILE: app/src/androidTest/java/com/northwind/shop/SignupFlowDeTest.kt ===============
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

=============== FILE: app/src/main/res/values/strings.xml ===============
<resources>
    <string name="signup_heading">Create your account</string>
    <string name="continue_label">Continue</string>
    <string name="email_invalid">Please enter a valid email address</string>
    <string name="email_taken">That email address is already registered</string>
    <string name="cart_total_label">Order total</string>
    <string name="privacy_link">Privacy policy</string>
</resources>

=============== FILE: app/src/main/res/values-de/strings.xml ===============
<resources>
    <string name="signup_heading">Konto erstellen</string>
    <string name="continue_label">Weiter</string>
    <string name="email_invalid">Bitte gib eine gultige E-Mail-Adresse ein</string>
    <string name="email_taken">Diese E-Mail-Adresse ist bereits registriert</string>
    <string name="cart_total_label">Gesamtbetrag</string>
    <string name="privacy_link">Datenschutzerklarung</string>
</resources>

=============== FILE: app/src/main/java/com/northwind/shop/PriceFormatter.kt ===============
package com.northwind.shop

import java.text.NumberFormat
import java.util.Locale

object PriceFormatter {

    private val currency: NumberFormat = NumberFormat.getCurrencyInstance(Locale.getDefault())

    fun format(amountMinor: Long): String = currency.format(amountMinor / 100.0)
}

=============== FILE: app/src/main/java/com/northwind/shop/NorthwindApp.kt ===============
package com.northwind.shop

import android.app.Application

class NorthwindApp : Application() {

    override fun onCreate() {
        super.onCreate()
        PriceFormatter.format(0) // warm up; the first cart render used to stutter
        Telemetry.start(this)
    }
}

=============== FILE: app/src/main/java/com/northwind/shop/LanguageSettings.kt ===============
package com.northwind.shop

import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat

object LanguageSettings {

    fun apply(tag: String) {
        AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(tag))
    }
}

=============== FILE: .github/workflows/instrumentation.yml ===============
name: instrumentation

on:
  schedule:
    - cron: '0 2 * * *'

jobs:
  en-lane:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          target: google_apis
          arch: x86_64
          profile: pixel_4a
          script: ./gradlew connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.notPackage=com.northwind.shop.de

  de-lane:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          target: google_apis
          arch: x86_64
          profile: pixel_4a
          script: ./gradlew connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.northwind.shop.SignupFlowDeTest

=============== FILE: app/build.gradle ===============
plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.northwind.shop'
    compileSdk 35

    defaultConfig {
        applicationId "com.northwind.shop"
        minSdk 24
        targetSdk 35
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.7.0'
    implementation 'com.squareup.retrofit2:retrofit:2.11.0'

    androidTestImplementation 'androidx.test.ext:junit:1.2.1'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.6.1'
    androidTestImplementation 'androidx.test:rules:1.6.1'
}

=============== FILE: reports/nightly-2026-09-11.txt ===============
### Nightly 2026-09-11 - de-lane job, one instrumentation process, pid 6104 throughout

com.northwind.shop.SignupFlowDeTest > signupHeadingIsGerman FAILED
androidx.test.espresso.base.DefaultFailureHandler$AssertionFailedWithCauseError:
'with text: is "Konto erstellen"' doesn't match the selected view.
Expected: with text: is "Konto erstellen"
     Got: "AppCompatTextView{id=2131231044, res-name=signup_heading, text=Create your account}"
    elapsed: 1.1s

com.northwind.shop.SignupFlowDeTest > continueButtonAdvancesToDelivery FAILED
androidx.test.espresso.NoMatchingViewException: No views in hierarchy found matching: with text: is "Weiter"
    View Hierarchy:
    +->AppCompatTextView{id=2131231044, res-name=signup_heading, text=Create your account}
    +->AppCompatEditText{id=2131231012, res-name=email_field, text=dana@northwind.test}
    +->AppCompatButton{id=2131231007, res-name=continue_button, text=Continue}
    elapsed: 1.4s

com.northwind.shop.SignupFlowDeTest > emailValidationMessageIsGerman FAILED
Expected: with text: is "Bitte gib eine gultige E-Mail-Adresse ein"
     Got: "AppCompatTextView{id=2131231014, res-name=email_error, text=Please enter a valid email address}"
    elapsed: 1.6s

com.northwind.shop.SignupFlowDeTest > cartTotalIsFormattedForTheLocale FAILED
Expected: with text: is "1.234,56 EUR"
     Got: "AppCompatTextView{id=2131231002, res-name=cart_total, text=EUR1,234.56}"
    elapsed: 1.9s

com.northwind.shop.SignupFlowDeTest > germanTranslationsAreLoaded PASSED (1.0s)
com.northwind.shop.SignupFlowDeTest > postcodeFieldAcceptsGermanFormat PASSED (1.2s)
com.northwind.shop.SignupFlowDeTest > signupSucceedsWithValidDetails PASSED (2.3s)
com.northwind.shop.SignupFlowDeTest > privacyLinkOpensPolicy PASSED (1.1s)

com.northwind.shop.SignupFlowDeTest > errorBannerShownOnDuplicateEmail FAILED
Expected: with text: is "Diese E-Mail-Adresse ist bereits registriert"
     Got: "AppCompatTextView{id=2131231021, res-name=error_banner, text=That email address is already registered}"
    elapsed: 2.2s

9 tests, 4 passed, 5 failed

### Same night, en-lane job, pid 6231 throughout

com.northwind.shop.SignupFlowEnTest - 9 tests, 9 passed
com.northwind.shop.ReceiptTest - 4 tests, 4 passed
com.northwind.shop.SearchTest - 6 tests, 6 passed

=============== FILE: reports/nightly-2026-09-08.txt ===============
### Nightly 2026-09-08 - before the shard split, both lanes ran in one job, pid 5880 throughout

Class order that night: ReceiptTest, SearchTest, SignupFlowEnTest, SignupFlowDeTest

com.northwind.shop.ReceiptTest - 4 tests, 4 passed
com.northwind.shop.SearchTest - 6 tests, 6 passed
com.northwind.shop.SignupFlowEnTest - 9 tests, 9 passed
com.northwind.shop.SignupFlowDeTest - 9 tests, 4 passed, 5 failed
  (same five as every other night)

### Nightly 2026-09-09 - same single job, class order reversed by the runner

Class order that night: SignupFlowDeTest, SignupFlowEnTest, ReceiptTest, SearchTest

com.northwind.shop.SignupFlowDeTest - 9 tests, 4 passed, 5 failed
com.northwind.shop.SignupFlowEnTest - 9 tests, 9 passed
com.northwind.shop.ReceiptTest - 4 tests, 3 passed, 1 failed
  receiptDateMatchesOrderDate FAILED
  Expected: with text: is "14 Aug 2026"
       Got: "AppCompatTextView{id=2131231088, res-name=receipt_date, text=14.08.2026}"
com.northwind.shop.SearchTest - 6 tests, 5 passed, 1 failed
  resultCountReadsAsThousands FAILED
  Expected: with text: is "1,204 results"
       Got: "AppCompatTextView{id=2131231099, res-name=result_count, text=1.204 results"
