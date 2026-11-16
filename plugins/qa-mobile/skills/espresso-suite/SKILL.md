---
name: espresso-suite
description: "Use whenever an Android app needs UI tests in Google's Espresso: onView with perform and check, automatic synchronization instead of sleeps, IdlingResource for app async work, ./gradlew connectedAndroidTest and JUnit XML results."
---

# espresso-suite

## Overview

Per [espresso-doc][esp]:

[esp]: https://developer.android.com/training/testing/espresso

> "Espresso is a framework for writing concise, beautiful, and
> reliable Android UI tests."

The canonical example:

```kotlin
@Test
fun greeterSaysHello() {
    onView(withId(R.id.name_field)).perform(typeText("Steve"))
    onView(withId(R.id.greet_button)).perform(click())
    onView(withText("Hello Steve!")).check(matches(isDisplayed()))
}
```

The shape: `onView(<matcher>).perform(<action>).check(<matches>)`.

The framework auto-waits via "synchronization conditions" per
[espresso-doc][esp]:

> "Each time a test invokes onView(), Espresso waits to perform
> the corresponding UI action or assertion until these
> synchronization conditions are met:
> - The message queue doesn't have any messages that Espresso needs to immediately process
> - There are no instances of AsyncTask currently executing a task
> - All developer-defined idling resources are idle"

This eliminates the need for `Thread.sleep` for stock Android
async work.

## When to use

- An Android app needs UI tests in Google's first-party framework.
- The team is not on cross-platform (Detox / Appium); pure Android
  stack.
- A flake-prone Espresso suite needs the IdlingResource pattern
  to stabilize.

## Step 1 - Add dependencies

```gradle
// app/build.gradle
android {
    defaultConfig {
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
}

dependencies {
    androidTestImplementation 'androidx.test.ext:junit:1.2.1'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.6.1'
    androidTestImplementation 'androidx.test.espresso:espresso-contrib:3.6.1'
    androidTestImplementation 'androidx.test.espresso:espresso-intents:3.6.1'
    androidTestImplementation 'androidx.test:rules:1.6.1'
}
```

Per [espresso-doc][esp], Espresso ships as multiple packages:

| Package                       | Purpose                                                        |
|-------------------------------|----------------------------------------------------------------|
| `espresso-core`                | Core View matchers, actions, assertions.                       |
| `espresso-web`                 | WebView support.                                                |
| `espresso-idling-resource`     | Synchronization for background jobs.                           |
| `espresso-contrib`             | DatePicker, RecyclerView, Drawer actions, accessibility checks.|
| `espresso-intents`             | Intent validation + stubbing.                                   |
| `espresso-remote`              | Multi-process functionality.                                    |

## Step 2 - Author tests

```kotlin
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.*
import androidx.test.espresso.assertion.ViewAssertions.*
import androidx.test.espresso.matcher.ViewMatchers.*
import androidx.test.ext.junit.rules.ActivityScenarioRule

@RunWith(AndroidJUnit4::class)
class CheckoutTest {
    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    @Test
    fun applyPromoCode() {
        onView(withId(R.id.promo_field)).perform(typeText("WELCOME10"), closeSoftKeyboard())
        onView(withId(R.id.apply_button)).perform(click())
        onView(withId(R.id.subtotal)).check(matches(withText("$22.49")))
    }
}
```

## Step 3 - IdlingResource for app-specific async

When the app uses something Espresso doesn't auto-track (e.g.
custom thread pool, RxJava chains), wire an IdlingResource:

```kotlin
class NetworkIdlingResource : IdlingResource {
    @Volatile private var callback: IdlingResource.ResourceCallback? = null
    @Volatile private var pendingRequests = 0

    override fun getName() = "NetworkIdlingResource"
    override fun isIdleNow() = pendingRequests == 0
    override fun registerIdleTransitionCallback(cb: IdlingResource.ResourceCallback) {
        callback = cb
    }

    fun increment() = synchronized(this) { pendingRequests++ }
    fun decrement() = synchronized(this) {
        pendingRequests--
        if (pendingRequests == 0) callback?.onTransitionToIdle()
    }
}

// Wire from production code at network call sites:
networkIdlingResource.increment()
api.fetchOrders().enqueue { _, _ -> networkIdlingResource.decrement() }

// Register in test setup:
@Before fun setup() { IdlingRegistry.getInstance().register(networkIdlingResource) }
@After  fun teardown() { IdlingRegistry.getInstance().unregister(networkIdlingResource) }
```

Without IdlingResource, Espresso assumes idle when its built-in
trackers report idle - async work the framework can't see triggers
flake.

## Step 4 - Common matchers and actions

```kotlin
// Matchers
withId(R.id.button)              // by ID
withText("Submit")                // by displayed text
withContentDescription("Login")   // by content description
hasSibling(withText("Email"))     // structural relationship
isDisplayed()                     // currently visible

// Actions
click(), longClick()
typeText("..."), clearText()
scrollTo(), swipeLeft(), swipeUp()
pressBack()

// Assertions
matches(withText("Hello"))
matches(isDisplayed())
matches(isEnabled())
doesNotExist()
```

## Step 5 - RecyclerView interactions

```kotlin
// espresso-contrib provides RecyclerViewActions
onView(withId(R.id.cart_list))
    .perform(RecyclerViewActions.actionOnItemAtPosition<MyViewHolder>(0, click()))

onView(withId(R.id.cart_list))
    .perform(RecyclerViewActions.scrollTo<MyViewHolder>(hasDescendant(withText("BOOK-001"))))
```

## Intents: stub other apps instead of opening them

A test that taps "Take photo", "Pick file" or "Choose contact" leaves
the app under test: on CI the real camera or picker opens, Espresso
cannot drive it, the test fails, and the foreign activity can stay on
top for the next test. Espresso-Intents records outgoing intents and
answers them with a canned result ([espresso-intents][intents]):

```kotlin
// app/build.gradle.kts
androidTestImplementation("androidx.test.espresso:espresso-intents:3.6.1")
```

```kotlin
@RunWith(AndroidJUnit4::class)
class AttachDocumentTest {
    @get:Rule val scenario = ActivityScenarioRule(ComposeMessageActivity::class.java)

    @Before fun setUp() = Intents.init()      // start recording before any action
    @After fun tearDown() = Intents.release()  // always, or the next test inherits stubs

    @Test fun attachingAPdfShowsItsName() {
        val picked = Intent().setData(Uri.parse("content://test/docs/invoice.pdf"))
        intending(hasAction(Intent.ACTION_OPEN_DOCUMENT))
            .respondWith(Instrumentation.ActivityResult(Activity.RESULT_OK, picked))  // 1. stub first

        onView(withId(R.id.attach)).perform(click())                                 // 2. then act

        intended(allOf(hasAction(Intent.ACTION_OPEN_DOCUMENT), hasType("application/pdf")))  // 3. verify
        onView(withId(R.id.attachment_name)).check(matches(withText("invoice.pdf")))
    }
}
```

- **Init and release around every test.** The guide's `IntentsTestRule`
  "initializes Espresso-Intents before each test annotated with `@Test`
  and releases Espresso-Intents after each test run"
  ([espresso-intents][intents]); with `ActivityScenario`, do the same
  with `Intents.init()` / `Intents.release()` in `@Before` / `@After`.
- **Stub before the action** that sends the intent, as in the guide's
  example; a stub added after the click is too late.
- **Return the data the activity reads.** If the result handler returns
  early on a null `data` Intent or a missing extra, an empty
  `ActivityResult` makes the test pass through the wrong branch. For
  `MediaStore.ACTION_IMAGE_CAPTURE` without `EXTRA_OUTPUT`, the camera
  app returns "a small `Bitmap` in the extras, under the key `"data"`"
  ([photo-basics][mediastore]), so the stub must put one there.
- **Verify with `intended()`,** which works like `Mockito.verify()`
  ([espresso-intents][intents]), so the test proves the right intent
  was sent rather than only that the UI changed.
- **Runtime permissions** (camera, location, contacts) show a system
  dialog Espresso cannot click. Grant them for the test with
  `@get:Rule val perms: GrantPermissionRule = GrantPermissionRule.grant(Manifest.permission.CAMERA)`
  ([grant-permission][grantperm]).
- **No `Thread.sleep`** to wait for the result: the stubbed result is
  delivered on the main thread and Espresso synchronizes on it.

[intents]: https://developer.android.com/training/testing/espresso/intents
[mediastore]: https://developer.android.com/media/camera/camera-deprecated/photobasics
[grantperm]: https://developer.android.com/reference/androidx/test/rule/GrantPermissionRule

## Step 6 - Run

```bash
# Unit + UI tests on connected device / emulator
./gradlew connectedAndroidTest

# With test orchestrator (each test in fresh process - preferred for isolation):
android {
    defaultConfig {
        testInstrumentationRunnerArguments clearPackageData: 'true'
    }
    testOptions {
        execution 'ANDROIDX_TEST_ORCHESTRATOR'
    }
}
```

## Step 7 - CI integration (Android emulator on GitHub Actions)

```yaml
jobs:
  ui-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          script: ./gradlew connectedAndroidTest
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: app/build/outputs/androidTest-results
```

The test results land in JUnit XML at
`app/build/outputs/androidTest-results/.../TEST-*.xml` - 
consumable by `junit-xml-analysis` (in the qa-test-reporting plugin).

## Anti-patterns

| Anti-pattern                                                         | Why it fails                                                              | Fix |
|----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| `Thread.sleep` for async waits                                       | Espresso has built-in sync; sleeps mask race conditions.                  | Use IdlingResource for unsupported async (Step 3). |
| `withText("Submit")` for buttons                                      | Translation breaks the test.                                              | `withId(R.id.submit_button)` or `withContentDescription`. |
| Missing `closeSoftKeyboard()` after typing                            | Keyboard obscures next view; `click()` misses.                            | Chain `closeSoftKeyboard()` after `typeText`. |
| Skipping `IdlingResource` for Retrofit / OkHttp                       | Network async invisible; flaky.                                            | Wire IdlingResource (Step 3) OR use OkHttp's IdlingResource bridge. |
| Tapping a button that opens the camera, a picker or another app       | Leaves the app; CI has no way to drive the foreign activity.              | Espresso-Intents `intending(...).respondWith(...)` before the tap; `intended(...)` after. |
| `Intents.init()` without `Intents.release()`                          | Recorded intents and stubs leak into the next test.                       | Release in `@After` (or use the rule). |
| One mega-test that asserts 10 things                                  | One failure obscures others; debugging hard.                              | One assertion target per `@Test`. |
| Skipping test orchestrator                                            | Tests share process; one test's state leaks.                              | Enable `ANDROIDX_TEST_ORCHESTRATOR` (Step 6). |

## Limitations

- **In-process only.** Espresso runs in the app's process; no cross-app
  flows. Use UIAutomator for system-UI / multi-app interactions.
- **No iOS / web.** Single-platform; for cross-platform see
  `appium-testing`.
- **Async opacity.** Custom executors / coroutines need explicit
  IdlingResource integration.
- **Emulator slowness.** Real devices ~2× faster than emulators
  for UI tests; consider device farms (Firebase Test Lab, AWS
  Device Farm) for matrix runs.

## References

- [esp][esp] - Espresso doc: small/predictable API, automatic
  synchronization (message queue / AsyncTask / IdlingResource),
  package list (`-core`, `-web`, `-contrib`, `-idling-resource`,
  `-intents`, `-remote`).
- [espresso-intents][intents] - Espresso-Intents setup, stubbing with
  `intending`, verification with `intended`.
- [photo-basics][mediastore] - `ACTION_IMAGE_CAPTURE` thumbnail in the `"data"` extra.
- [grant-permission][grantperm] - `GrantPermissionRule`.
- `xcuitest-suite` - iOS sibling.
- `appium-testing` - cross-platform
  alternative.
- `junit-xml-analysis` - downstream parser.
