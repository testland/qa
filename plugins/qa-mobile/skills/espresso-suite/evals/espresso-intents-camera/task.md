# The profile-photo test opens the real camera on CI

## Problem Description

Our profile-photo Espresso test opens the real camera on CI and then fails, and it breaks the next test too (`ci-log.txt`). Fix the test and the Gradle file.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: app/src/androidTest/java/com/shop/ProfilePhotoTest.kt ===============
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

=============== FILE: app/src/main/java/com/shop/ProfileActivity.kt ===============
// take_photo: requests CAMERA permission, then
// startActivityForResult(Intent(MediaStore.ACTION_IMAGE_CAPTURE), REQ)
// onActivityResult: val bmp = data?.extras?.get("data") as? Bitmap ?: return; avatar.setImageBitmap(bmp)

=============== FILE: app/build.gradle.kts ===============
dependencies {
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
}

=============== FILE: ci-log.txt ===============
System dialog: "Allow Shop to take pictures and record video?" stays on screen.
Camera app opened on the emulator. Test failed: avatar not displayed. Next test: IllegalStateException: #init was called twice in a row.
