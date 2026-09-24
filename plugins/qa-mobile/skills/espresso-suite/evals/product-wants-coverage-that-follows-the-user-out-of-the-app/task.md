# Five automation requests from product and I need a verdict on each before Thursday

## Problem Description

`com.northwind.shop`, Android, Kotlin. After the August release went badly Dana
in product wrote down five things she wants covered automatically and put them
on Thursday's planning agenda. Bilal, who joined us in July, took a run at all
five last week and got a long way on one of them and nowhere on the rest. His
notes are attached, along with Dana's list.

The two loudest opinions in the room are both absolute and I do not believe
either one.

Dana's position is that the app is ours, so all five are automatable and the only
question is how long each takes. Hendrik's position is that anything the user can
see which is not one of our own screens is out of scope for this job, and that we
should cut 1, 3 and 4 on that basis and stop discussing it.

What I actually need is a per-request answer I can defend at planning: for each
of the five, whether we cover it here, cover part of it here, or do not cover it
here - and for the parts we are not covering, what the honest alternative is, so
Dana does not leave the room thinking the gap has been filled when it has not.

Where something is coverable, I would rather see the test than a description of
it. Our conventions are in the one class we already have; follow them.

## Output Specification

1. Write `docs/automation-verdicts.md` with a numbered section per request. Each
   section gives one of three verdicts - covered here, covered in part here, or
   not covered here - and for anything partial or refused, states plainly what
   is being given up and what would cover it instead.
2. For every request you say is covered in whole or in part, add the test under
   `app/src/androidTest/java/com/northwind/shop/` and list any module build file
   change it needs.
3. Do not change the existing method in `OrderHistoryTest.kt`.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/requests-from-product.md ===============
# Automation requests - Dana, 2026-09-08

1. When a customer has notifications switched off we show a banner with an
   "Open settings" button. I want a test that taps it, turns notifications on,
   comes back to the app and confirms the banner is gone.

2. Tapping the heart on a product pops up a little message that says "Saved to
   your wishlist". It stopped appearing for two weeks in July and nobody
   noticed. I want that message covered.

3. The background sync writes failures to a screen the customer sees when they
   next open the app. That screen was broken for the whole of the August release
   and showed a blank panel. I want a test that makes the sync fail and confirms
   the screen tells the customer what happened.

4. A customer picks a profile photo through the picker the phone provides. Twice
   this year the photo has come back and then not appeared on the profile. I
   want that covered.

5. Order history is a long list. Support keeps getting tickets saying an order
   is missing when it is just further down. I want a test that finds order
   NW-10042 in an account with four hundred orders and confirms it shows the
   right total.

=============== FILE: reports/bilal-notes.md ===============
# Where I got to - Bilal, 2026-09-11

**Request 5.** Nearly there. `onView(withText("NW-10042")).check(matches(isDisplayed()))`
throws `NoMatchingViewException` and the hierarchy dump only has nine rows in it,
which confused me for a whole morning because the account definitely has four
hundred. I tried asserting on the row id instead and got the same thing. The
account is seeded and NW-10042 is at position 213.

**Request 2.** I can see the message on the device and I have a screenshot the
harness captured at the moment of failure with the message clearly on it, and
`onView(withText("Saved to your wishlist"))` still throws `NoMatchingViewException`
at that exact moment. The hierarchy dump attached to the failure lists the
product screen's views and nothing else. I do not understand how both of those
can be true.

**Request 3.** I can make the sync fail and I can see the failure screen come up
on the emulator. Every matcher I write against it throws. The hierarchy dump has
the shop's own views in it and none of the ones I can see on screen. Logcat at
the moment of the failure:

    09-11 14:02:51.440 I/ActivityManager: Displayed com.northwind.shop/.SyncErrorActivity
    09-11 14:02:51.441 D/Northwind: sync worker reporting, pid=5120, name=com.northwind.shop:sync
    09-11 14:02:51.502 D/Northwind: shop ui alive, pid=5104, name=com.northwind.shop

**Requests 1 and 4.** Both of these take me off our screens. On 1 I get the
phone's settings app and nothing I write matches anything on it. On 4 I get the
picker and the same thing happens. The dumps in both cases have nothing from
`com.northwind.shop` in them at all.

=============== FILE: app/src/main/AndroidManifest.xml ===============
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:name=".NorthwindApp"
        android:label="Northwind">

        <activity android:name=".ShopActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <activity android:name=".ProfileActivity" />
        <activity android:name=".OrderHistoryActivity" />

        <activity
            android:name=".SyncErrorActivity"
            android:process=":sync" />

        <service
            android:name=".SyncService"
            android:process=":sync"
            android:exported="false" />
    </application>
</manifest>

=============== FILE: app/src/main/java/com/northwind/shop/WishlistButton.kt ===============
package com.northwind.shop

import android.content.Context
import android.widget.Toast

class WishlistButton(private val context: Context, private val store: WishlistStore) {

    fun onHeartTapped(productId: String) {
        store.add(productId)
        Toast.makeText(context, R.string.wishlist_saved, Toast.LENGTH_SHORT).show()
        WishlistBadge.refresh(store.count())
    }
}

=============== FILE: app/src/main/java/com/northwind/shop/ProfileAvatar.kt ===============
package com.northwind.shop

import android.net.Uri
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment

class ProfileAvatar(private val fragment: Fragment, private val profile: ProfileStore) {

    private lateinit var picker: ActivityResultLauncher<String>

    fun register() {
        picker = fragment.registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
            if (uri != null) onAvatarPicked(uri)
        }
    }

    fun launch() {
        picker.launch("image/*")
    }

    fun onAvatarPicked(uri: Uri) {
        profile.setAvatar(uri)
        fragment.requireView().findViewById<android.widget.ImageView>(R.id.avatar_image)
            .setImageURI(uri)
    }
}

=============== FILE: app/src/main/java/com/northwind/shop/SyncService.kt ===============
package com.northwind.shop

import android.app.Service
import android.content.Intent
import android.os.IBinder

class SyncService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val result = SyncEngine.runOnce()
        if (result.failed) {
            startActivity(
                Intent(this, SyncErrorActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    .putExtra("reason", result.reason)
            )
        }
        return START_NOT_STICKY
    }
}

=============== FILE: app/src/androidTest/java/com/northwind/shop/OrderHistoryTest.kt ===============
package com.northwind.shop

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
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
    fun historyScreenOpens() {
        onView(withId(R.id.order_history_list)).check(matches(isDisplayed()))
    }
}

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
    implementation 'androidx.recyclerview:recyclerview:1.3.2'
    implementation 'androidx.fragment:fragment-ktx:1.8.5'

    androidTestImplementation 'androidx.test.ext:junit:1.2.1'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.6.1'
    androidTestImplementation 'androidx.test:rules:1.6.1'
}
