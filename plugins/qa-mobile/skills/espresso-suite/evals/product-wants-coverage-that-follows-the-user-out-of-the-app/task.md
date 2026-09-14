# Five coverage asks landed on the Android test backlog and I cannot tell which of them we can actually do

## Problem Description

I run the Android team at Northwind Shop. Product sent over five things they want
the on-device UI tests to cover before the November release, listed in the
attached request. Ravi, who wrote it, has been told by someone in the iOS channel
that all five are "just UI automation" and has put all five on the sprint with
the same estimate.

I have one existing test class for the order history screen with a single test in
it that has been green since March, and a module build file that has not been
touched in a year. An intern took a run at items 1, 2 and 5 over the summer; what
his branch produced is in the attached failure log. He left before anyone
reviewed it and the branch was never merged.

What I need is an honest sorting of the five before we commit to the sprint, and
the ones that are genuinely doable actually written, because "we'll look at it
next sprint" on all five is how this went last time. If something on that list
cannot be done with the framework we already use, I need that said plainly and I
need to know what it would take instead, because I have to go back to Ravi with a
number. What I do not want is five tests that look finished in the PR and then
sit red or flaky in the nightly job, which is the state the intern's branch was
in when we found it.

Row ids on the history screen are `order_row_<n>`, the order number lives in a
`TextView` with id `order_number`, and the status chip is `status_badge`. The
order list holds about 200 rows for a long-standing account.

## Output Specification

1. Write tests for every item you judge coverable, into
   `app/src/androidTest/java/com/northwind/shop/`. Do not put more than one
   item's assertions into a single test method.
2. Update `app/build.gradle` with whatever those tests need. Keep the existing
   dependencies.
3. Do not modify or delete `showsMostRecentOrderFirst`.
4. Write `docs/coverage-response.md` with a verdict on each of the five items,
   numbered the same way Ravi numbered them, saying for each what we are
   covering, what we are not, and what the part we are not covering would take
   instead. Ravi needs to read it and re-estimate without asking a follow-up
   question.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/coverage-request.md ===============
# Android UI coverage asks for the November release
Raised by Ravi P, 2026-09-02. All five wanted before the release branch cuts.

1. **Order confirmation notification.** After a successful checkout the app posts
   a notification titled "Order confirmed". Pull down the notification shade, tap
   it, and check that the order detail screen for that order opens. Support gets
   a ticket about this roughly monthly.

2. **Unlocking saved cards.** On the account screen there is an Unlock saved
   cards button. Tapping it brings up our fingerprint prompt with the title
   "Unlock saved cards" and our own cancel wording underneath. Authenticate on
   it, and check that the saved-cards list (`saved_cards_root`) is then on
   screen. This is our most-reported "it did nothing" flow.

3. **Share a receipt.** From the order detail screen, tap Share. The Android
   share sheet opens. Pick the mail app, and check that the compose screen that
   opens has the order number in the subject line and the receipt total in the
   body.

4. **Help page links.** The Help screen is a `WebView` pointed at
   `https://help.northwind.example/app`. Check that the page contains a
   "Contact support" link, and that tapping it lands the user on the in-app
   support form (`support_form_root`) rather than leaving the app.

5. **Refunded order in the history list.** For an account with about 200 orders,
   check that the row for order `NW-10042` shows the status chip "Refunded".
   This one regressed twice in the spring and nobody caught it.

=============== FILE: app/src/androidTest/java/com/northwind/shop/OrderHistoryTest.kt ===============
package com.northwind.shop

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.hasDescendant
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
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
    fun showsMostRecentOrderFirst() {
        onView(withId(R.id.order_row_0))
            .check(matches(hasDescendant(withText("NW-11987"))))
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
    implementation 'androidx.biometric:biometric:1.1.0'

    androidTestImplementation 'androidx.test.ext:junit:1.2.1'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.6.1'
}

=============== FILE: reports/intern-branch-failures.txt ===============
Branch: sandbox/vkulkarni/ui-coverage, last run 2026-07-19, Pixel 6 API 34.
Nothing on this branch ever went green on the build agent.

--- item 2, attempt with an in-process view matcher -------------------------
com.northwind.shop.VaultTest > unlocksSavedCardsWithFingerprint FAILED
androidx.test.espresso.NoMatchingViewException: No views in hierarchy found matching: with text: is "Unlock saved cards"

If the target view is not part of the view hierarchy, you may need to use
Espresso.onData to load it from one of the following AdapterViews:

    View Hierarchy:
    +>DecorView{id=-1, visibility=VISIBLE, width=1080, height=2400}
    |
    +->LinearLayout{id=-1}
    |
    +-->FrameLayout{id=16908290, res-name=content}
    |
    +--->CoordinatorLayout{id=2131231044, res-name=account_root, visibility=VISIBLE}
    |
    +---->MaterialButton{id=2131231051, res-name=unlock_saved_cards_button, visibility=VISIBLE, text=Unlock saved cards}
    |
    +---->FrameLayout{id=2131231060, res-name=saved_cards_root, visibility=GONE}

    38 views dumped, all under com.northwind.shop. Branch note from V.K.:
    "screen recording shows the prompt filling the bottom half of the display at
    the moment this dump was taken. I do not understand why it is not in here."

--- item 1, attempt with an in-process view matcher -------------------------
com.northwind.shop.NotificationTest > opensOrderFromNotification FAILED
androidx.test.espresso.NoMatchingViewException: No views in hierarchy found matching: with text: is "Order confirmed"
    63 views dumped, all under com.northwind.shop.

--- item 5, first attempt: match the row by its text ------------------------
com.northwind.shop.OrderHistoryTest > showsRefundedBadge FAILED
androidx.test.espresso.NoMatchingViewException: No views in hierarchy found matching: with text: is "NW-10042"
    View Hierarchy:
    +-->RecyclerView{id=2131231301, res-name=orders_list, visibility=VISIBLE, child-count=9}

--- item 5, second attempt: scroll first, then match ------------------------
com.northwind.shop.OrderHistoryTest > showsRefundedBadge FAILED
androidx.test.espresso.PerformException: Error performing 'scroll to' on view 'view.getId() is <2131231301/com.northwind.shop:id/orders_list>'.
Caused by: java.lang.RuntimeException: Action will not be performed because the target view does not match one or more of the following constraints:
(view has effective visibility <VISIBLE> and is descendant of a: (is assignable from class <class android.widget.ScrollView> or is assignable from class <class android.widget.HorizontalScrollView> or is assignable from class <class androidx.core.widget.NestedScrollView>))
Target view: "RecyclerView{id=2131231301, res-name=orders_list, visibility=VISIBLE, child-count=9}"

--- items 3 and 4 -----------------------------------------------------------
Not attempted. Branch notes say "share sheet + webview - ask someone".

=============== FILE: app/src/main/res/layout/activity_help.xml ===============
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <WebView
        android:id="@+id/help_web_view"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

    <FrameLayout
        android:id="@+id/support_form_root"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:visibility="gone" />
</FrameLayout>

=============== FILE: app/src/main/java/com/northwind/shop/HelpActivity.kt ===============
package com.northwind.shop

import android.os.Bundle
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity

class HelpActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_help)
        val web = findViewById<WebView>(R.id.help_web_view)
        web.settings.javaScriptEnabled = true
        web.webViewClient = SupportFormInterceptingClient(this)
        web.loadUrl("https://help.northwind.example/app")
    }
}

=============== FILE: app/src/main/java/com/northwind/shop/ReceiptShare.kt ===============
package com.northwind.shop

import android.content.Context
import android.content.Intent

object ReceiptShare {

    fun share(context: Context, order: Order) {
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, "Northwind receipt ${order.number}")
            putExtra(Intent.EXTRA_TEXT, "Total: ${order.total}")
        }
        context.startActivity(Intent.createChooser(send, "Share receipt"))
    }
}

=============== FILE: app/src/main/java/com/northwind/shop/VaultUnlock.kt ===============
package com.northwind.shop

import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity
import java.util.concurrent.Executor

class VaultUnlock(
    private val activity: FragmentActivity,
    private val executor: Executor,
    private val onUnlocked: () -> Unit,
) {

    private val promptInfo = BiometricPrompt.PromptInfo.Builder()
        .setTitle("Unlock saved cards")
        .setSubtitle("Confirm it is you before we show your cards")
        .setNegativeButtonText("Use my password instead")
        .build()

    fun start() {
        BiometricPrompt(activity, executor, object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                onUnlocked()
            }

            override fun onAuthenticationError(code: Int, message: CharSequence) {
                activity.findViewById<android.view.View>(R.id.unlock_error).visibility =
                    android.view.View.VISIBLE
            }
        }).authenticate(promptInfo)
    }
}

=============== FILE: app/src/main/java/com/northwind/shop/AccountActivity.kt ===============
package com.northwind.shop

import android.os.Bundle
import android.view.View
import androidx.fragment.app.FragmentActivity
import java.util.concurrent.Executors

class AccountActivity : FragmentActivity() {

    private lateinit var vaultUnlock: VaultUnlock

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_account)
        vaultUnlock = VaultUnlock(this, Executors.newSingleThreadExecutor()) { revealSavedCards() }
        findViewById<View>(R.id.unlock_saved_cards_button).setOnClickListener { vaultUnlock.start() }
    }

    private fun revealSavedCards() {
        runOnUiThread { findViewById<View>(R.id.saved_cards_root).visibility = View.VISIBLE }
    }
}
