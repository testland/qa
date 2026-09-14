# The auth class has not gone green two nights running since we split the nightly across two emulators

## Problem Description

`com.northwind.auth`, Android app, one instrumentation class, four tests.

Back in July this class was red most nights and the failures moved around.
Marguerite pinned the method order alphabetically and renamed the four tests
with letter prefixes so that the order that worked would hold, and that bought
us six quiet weeks. In August we split the nightly across two emulators to get
the job under twenty minutes; the runner distributes the four methods between
the two devices and decides the split per run. Since then the class has been red
about half the time - some nights two tests are red, some nights one, some
nights none - and which ones are red changes with how the split falls. One of
the tests that goes red has not been edited by anyone in six months.

The class also has a setup block that wipes our session preferences before each
test, which Marguerite added at the same time and which nobody has since been
able to show made any difference either way.

Rosa has written up a proposal, attached, to merge the four tests into one long
test method that walks the states in the order that currently works. Her
argument is decent and I want to be fair to it: it is one user journey, the
dependency between the steps is real, and writing it down as one method is more
honest than pretending four independent tests exist when they clearly do not.
Half the team is for it. It would certainly make the nightly green.

I would like a second opinion before we do that, because something about it
bothers me and I cannot name it. Attached: the module build file, the test
class, the store classes that hold whatever is leaking, and the nightly log,
including the single-method runs Karim did on Thursday.

## Output Specification

1. Change whatever needs changing so the class passes on a clean checkout no
   matter how the nightly splits the methods across the two emulators. That may
   mean editing `app/build.gradle`, `SessionTest.kt`, or both.
2. Do not weaken, relax or remove any assertion.
3. Write `docs/session-test-isolation.md` that says what is actually leaking
   between the tests, gives a verdict on Rosa's proposal that she will find
   fair, and states the cost of whatever you have chosen instead so the team can
   decide with their eyes open.

## Input Files

Extract the following files before beginning.

=============== FILE: app/build.gradle ===============
plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.northwind.auth'
    compileSdk 35

    defaultConfig {
        applicationId "com.northwind.auth"
        minSdk 24
        targetSdk 35
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        debug {
            testCoverageEnabled true
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.7.0'
    implementation 'androidx.room:room-runtime:2.6.1'

    androidTestImplementation 'androidx.test.ext:junit:1.2.1'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.6.1'
    androidTestImplementation 'androidx.test:rules:1.6.1'
}

=============== FILE: app/src/androidTest/java/com/northwind/auth/SessionTest.kt ===============
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

=============== FILE: app/src/main/java/com/northwind/auth/SessionStore.kt ===============
package com.northwind.auth

import android.content.Context
import androidx.room.Room
import java.io.File

class SessionStore(private val context: Context) {

    private val prefs = context.getSharedPreferences("session", Context.MODE_PRIVATE)

    private val db = Room.databaseBuilder(context, NorthwindDb::class.java, "northwind.db").build()

    private val avatarDir = File(context.filesDir, "avatars")

    private val onboardingMarker = File(context.filesDir, "onboarding/notifications_asked")

    fun dismissPromoBanner() = prefs.edit().putBoolean("promo_banner_dismissed", true).commit()

    fun promoBannerDismissed(): Boolean = prefs.getBoolean("promo_banner_dismissed", false)

    fun saveToken(token: String) = db.sessionDao().upsert(SessionRow(token))

    fun token(): String? = db.sessionDao().current()?.token

    fun recordSearch(term: String) = db.recentSearchDao().insert(RecentSearch(term))

    fun recentSearches(): List<RecentSearch> = db.recentSearchDao().all()

    fun cacheAvatar(bytes: ByteArray, userId: String) {
        avatarDir.mkdirs()
        File(avatarDir, "$userId.png").writeBytes(bytes)
    }

    fun markNotificationsAsked() {
        onboardingMarker.parentFile?.mkdirs()
        onboardingMarker.createNewFile()
    }

    fun notificationsAlreadyAsked(): Boolean = onboardingMarker.exists()
}

=============== FILE: app/src/main/java/com/northwind/auth/NotificationPrompt.kt ===============
package com.northwind.auth

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat

object NotificationPrompt {

    fun shouldShowRationale(context: Context): Boolean =
        !SessionStore(context).notificationsAlreadyAsked() &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
}

=============== FILE: app/src/main/java/com/northwind/auth/HomeActivity.kt ===============
package com.northwind.auth

import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity

class HomeActivity : AppCompatActivity() {

    private lateinit var store: SessionStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)
        store = SessionStore(this)
        renderRationaleCard()
        renderRecentSearchChips()
        renderSignedInOrSignedOut(store.token() != null)
    }

    private fun renderRationaleCard() {
        findViewById<View>(R.id.notifications_rationale_card).visibility =
            if (NotificationPrompt.shouldShowRationale(this)) View.VISIBLE else View.GONE
    }

    fun onSignedIn(token: String, userId: String) {
        store.saveToken(token)
        store.cacheAvatar(fetchAvatarBytes(userId), userId)
        store.markNotificationsAsked()
        renderSignedInOrSignedOut(true)
    }

    fun onSearchSubmitted(term: String) {
        store.recordSearch(term)
        renderRecentSearchChips()
    }
}

=============== FILE: reports/nightly-runs.md ===============
# SessionTest, nightly job, since the two-emulator split

The runner distributes the four methods across the two emulators. Which methods
land on which device is decided per run.

| Date       | Device A ran | Device B ran | Failed |
|------------|--------------|--------------|--------|
| 2026-08-19 | a, c         | b, d         | d      |
| 2026-08-22 | a, b         | c, d         | -      |
| 2026-08-27 | c, a         | b, d         | a, d   |
| 2026-09-03 | b, d         | a, c         | d      |
| 2026-09-10 | c, d         | a, b         | -      |

Whole-class wall clock on the most recent green run (2026-09-10): 2 min 51 s
across the two devices.

## Single-method runs, Karim, 2026-09-11

Same build, same emulator image, one method per invocation, fresh emulator boot
before each:

```
:app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=...SessionTest#a_promptsForNotificationsOnFirstLaunch PASSED
:app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=...SessionTest#b_showsEmptyRecentSearches            PASSED
:app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=...SessionTest#c_signsInAndRemembersMe               PASSED
:app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=...SessionTest#d_showsRecentSearchesForSignedInUser  FAILED
```

Failure detail for `d_showsRecentSearchesForSignedInUser`, single-method run:

```
androidx.test.espresso.NoMatchingViewException: No views in hierarchy found
matching: view.getId() is <2131231355/com.northwind.auth:id/search_field>
    View Hierarchy:
    +>DecorView{id=-1, visibility=VISIBLE}
    |
    +->LinearLayout{id=2131231300, res-name=sign_in_form, visibility=VISIBLE}
    |
    +-->EditText{id=2131231301, res-name=email_field, visibility=VISIBLE}
```

Failure detail for `b_showsEmptyRecentSearches`, nightly 2026-08-27 equivalent
ordering reproduced locally as d then b in one process:

```
java.lang.AssertionError: 'has child count: <0>' doesn't match the selected view.
  Expected: has child count: <0>
  Got: "LinearLayout{id=2131231402, res-name=recent_search_chips, child-count=3}"
```

Failure detail for `a_promptsForNotificationsOnFirstLaunch`, nightly 2026-08-27:

```
androidx.test.espresso.NoMatchingViewException: No views in hierarchy found
matching: view.getId() is <2131231388/com.northwind.auth:id/notifications_rationale_card>
```

=============== FILE: docs/proposal-from-rosa.md ===============
# Proposal: collapse SessionTest into one journey test

Rosa M, 2026-09-11

We keep pretending these are four independent tests. They are not, and Karim's
single-method runs proved it on Thursday: `d` cannot pass on its own, because it
needs a signed-in user and only `c` produces one. The letter prefixes are us
admitting the dependency while keeping up the appearance of independence, and
the emulator split showed how thin that appearance is - the runner does not care
what we named things.

So let us stop pretending. One `@Test` called `signInJourney()` that does sign
in, then search, then asserts the chips, then asserts the rationale card, in the
order that works. Benefits:

- The nightly goes green tonight and stays green, split or not, because the
  whole journey lands on one device.
- No letter prefixes, so renames are safe again.
- It is one user journey, which is arguably what we should have written in the
  first place.
- Wall clock drops, because we stop restarting the activity four times.

Cost I can see: when it fails we get one red instead of four, and we have to
read the stack trace to find out which step broke. I think that is acceptable
given where we are.
