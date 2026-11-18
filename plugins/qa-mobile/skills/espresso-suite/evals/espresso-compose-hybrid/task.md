# The checkout test can't find the Pay button since Compose

## Problem Description

Half of our checkout screen moved to Jetpack Compose and `CheckoutTest.kt` can no longer find the Pay button. Fix the test, and add any small test hooks the composables need.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: app/src/androidTest/java/com/shop/CheckoutTest.kt ===============
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

=============== FILE: app/src/main/java/com/shop/PayButton.kt ===============
@Composable
fun PayButton(price: String, onPay: () -> Unit) {
    Button(onClick = onPay) {
        Column {
            Text("Pay now")
            Text(price, style = MaterialTheme.typography.labelSmall)
        }
    }
}
// "Payment confirmed" is a Compose Text shown after the suspend payment call returns.
