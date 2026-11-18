package com.shop

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.*
import androidx.test.espresso.intent.Intents
import androidx.test.espresso.intent.Intents.intending
import androidx.test.espresso.intent.matcher.IntentMatchers.hasAction
import androidx.test.ext.junit.rules.ActivityScenarioRule
import android.app.Activity
import android.app.Instrumentation
import android.provider.MediaStore
import org.junit.Rule
import org.junit.Test

class ProfilePhotoTest {
    @get:Rule val rule = ActivityScenarioRule(ProfileActivity::class.java)

    @Test fun takesProfilePhoto() {
        onView(withId(R.id.take_photo)).perform(click())
        Intents.init()
        intending(hasAction(MediaStore.ACTION_IMAGE_CAPTURE))
            .respondWith(Instrumentation.ActivityResult(Activity.RESULT_OK, null))
        Thread.sleep(3000)
        onView(withId(R.id.avatar)).check(matches(isDisplayed()))
    }
}
