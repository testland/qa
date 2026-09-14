# Two checkout taps stopped working and the branch meant to fix them made the job slower and no greener

## Problem Description

Northwind Pay, Android app, `com.northwind.pay`. Our on-device test job has two
reds in `CheckoutFlowTest` and both started the night the checkout screen
redesign merged, 2026-08-24.

`appliesPromoCode` fails on every configuration we run - my laptop emulator, the
build agent, Ivan's tablet.

`placesOrderWithSavedCard` fails on the build agent, which runs a Pixel 2 image
at 1080x1920, and passes on the Tab S9 Ultra at 1848x2960. Nothing in that test
has changed in four months. The third test in the file, `showsEmptyCartMessage`,
has never failed and I would rather nobody touched it.

Ivan spent Tuesday on it. His branch puts `Thread.sleep(1500)` in front of each
of the two failing taps and a `swipeUp()` before the second one. The job went
from 4 minutes to 11 and both tests are still red, just red differently - the
output from his branch is attached alongside the output from main. He has
decided the second one is now "a separate flake" and wants to merge the branch
anyway so that we can at least see past the first failure.

The release is on the 19th and I would rather not merge something that costs
seven minutes a run and fixes nothing. What I actually want, before I sign
anything off, is to know for each of these two reds whether we are looking at a
bug in the test or a bug in the checkout screen, because Ivan has spent a week
treating them as the same kind of problem.

Attached: the test file, the layout the redesign produced, the manifest entry
for the activity, a layout-inspector capture on both device configurations, and
the last three weeks of support tickets, in case any of it is relevant.

## Output Specification

1. Edit `app/src/androidTest/java/com/northwind/pay/CheckoutFlowTest.kt` and
   `app/src/main/res/layout/activity_checkout.xml` as your diagnosis requires.
   Do not weaken or delete any assertion, and do not touch `showsEmptyCartMessage`.
2. Write `docs/checkout-diagnosis.md` naming, for each of the two failing tests
   separately, what is actually broken and which file the fix belongs in.
3. In the same document, give a verdict on Ivan's branch that a reviewer can act
   on, and say for each failing test what has to be true before it goes green
   and who has to do it.

## Input Files

Extract the following files before beginning.

=============== FILE: app/src/androidTest/java/com/northwind/pay/CheckoutFlowTest.kt ===============
package com.northwind.pay

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
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
class CheckoutFlowTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(CheckoutActivity::class.java)

    @Test
    fun showsEmptyCartMessage() {
        onView(withId(R.id.empty_cart_message)).check(matches(isDisplayed()))
    }

    @Test
    fun appliesPromoCode() {
        onView(withId(R.id.promo_field)).perform(typeText("WELCOME10"))
        onView(withId(R.id.apply_button)).perform(click())
        onView(withId(R.id.subtotal)).check(matches(withText("22.49 USD")))
    }

    @Test
    fun placesOrderWithSavedCard() {
        onView(withId(R.id.saved_card_visa)).perform(click())
        onView(withId(R.id.place_order_button)).perform(click())
        onView(withId(R.id.order_confirmation)).check(matches(isDisplayed()))
    }
}

=============== FILE: app/src/main/AndroidManifest.xml ===============
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:label="@string/app_name">
        <activity
            android:name=".CheckoutActivity"
            android:exported="false"
            android:windowSoftInputMode="adjustNothing" />
        <activity
            android:name=".OrderConfirmationActivity"
            android:exported="false" />
    </application>
</manifest>

=============== FILE: app/src/main/res/layout/activity_checkout.xml ===============
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <androidx.core.widget.NestedScrollView
        android:id="@+id/checkout_scroll"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:fillViewport="true">

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="vertical"
            android:paddingHorizontal="16dp">

            <TextView
                android:id="@+id/empty_cart_message"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:text="@string/cart_is_empty" />

            <EditText
                android:id="@+id/promo_field"
                android:layout_width="match_parent"
                android:layout_height="140px"
                android:hint="@string/promo_hint"
                android:inputType="textCapCharacters"
                android:imeOptions="actionDone" />

            <Button
                android:id="@+id/apply_button"
                android:layout_width="264px"
                android:layout_height="132px"
                android:text="@string/apply" />

            <TextView
                android:id="@+id/subtotal"
                android:layout_width="match_parent"
                android:layout_height="wrap_content" />

            <include layout="@layout/partial_saved_cards" />
            <include layout="@layout/partial_upsell_rows" />

            <TextView
                android:id="@+id/legal_copy"
                android:layout_width="match_parent"
                android:layout_height="400px"
                android:text="@string/checkout_terms" />

            <Button
                android:id="@+id/place_order_button"
                android:layout_width="match_parent"
                android:layout_height="168px"
                android:text="@string/place_order" />

            <TextView
                android:id="@+id/order_confirmation"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:visibility="gone" />
        </LinearLayout>
    </androidx.core.widget.NestedScrollView>

    <View
        android:id="@+id/upsell_scrim"
        android:layout_width="match_parent"
        android:layout_height="220px"
        android:layout_gravity="bottom"
        android:alpha="0"
        android:clickable="true"
        android:background="@drawable/upsell_sheet_backdrop" />
</FrameLayout>

=============== FILE: reports/androidTest-failure.txt ===============
### main, build 8812, 2026-09-11

com.northwind.pay.CheckoutFlowTest > appliesPromoCode[Pixel_2_API_34] FAILED
androidx.test.espresso.PerformException: Error performing 'single click - At Coordinates: 180, 1502 and precision: 16, 16' on view 'view.getId() is <2131231012/com.northwind.pay:id/apply_button>'.
Caused by: java.lang.RuntimeException: Action will not be performed because the target view does not match one or more of the following constraints:
at least 90 percent of the view's area is displayed to the user.
Target view: "AppCompatButton{id=2131231012, res-name=apply_button, visibility=VISIBLE, alpha=1.0, width=264, height=132, x=48.0, y=1436.0, text=Apply}"

com.northwind.pay.CheckoutFlowTest > appliesPromoCode[Tab_S9U_API_34] FAILED
androidx.test.espresso.PerformException: Error performing 'single click - At Coordinates: 180, 1502 and precision: 16, 16' on view 'view.getId() is <2131231012/com.northwind.pay:id/apply_button>'.
Caused by: java.lang.RuntimeException: Action will not be performed because the target view does not match one or more of the following constraints:
at least 90 percent of the view's area is displayed to the user.
Target view: "AppCompatButton{id=2131231012, res-name=apply_button, visibility=VISIBLE, alpha=1.0, width=264, height=132, x=48.0, y=1436.0, text=Apply}"

com.northwind.pay.CheckoutFlowTest > placesOrderWithSavedCard[Pixel_2_API_34] FAILED
androidx.test.espresso.PerformException: Error performing 'single click - At Coordinates: 540, 2604 and precision: 16, 16' on view 'view.getId() is <2131231188/com.northwind.pay:id/place_order_button>'.
Caused by: java.lang.RuntimeException: Action will not be performed because the target view does not match one or more of the following constraints:
at least 90 percent of the view's area is displayed to the user.
Target view: "AppCompatButton{id=2131231188, res-name=place_order_button, visibility=VISIBLE, alpha=1.0, width=1012, height=168, x=34.0, y=2520.0, text=Place order}"

com.northwind.pay.CheckoutFlowTest > placesOrderWithSavedCard[Tab_S9U_API_34] PASSED
com.northwind.pay.CheckoutFlowTest > showsEmptyCartMessage[Pixel_2_API_34] PASSED
com.northwind.pay.CheckoutFlowTest > showsEmptyCartMessage[Tab_S9U_API_34] PASSED

### branch ivan/checkout-waits, build 8819, 2026-09-12
### diff: Thread.sleep(1500) before each failing perform, plus swipeUp() before
### the place_order_button click. No other change.

com.northwind.pay.CheckoutFlowTest > appliesPromoCode[Pixel_2_API_34] FAILED
androidx.test.espresso.PerformException: Error performing 'single click - At Coordinates: 180, 1502 and precision: 16, 16' on view 'view.getId() is <2131231012/com.northwind.pay:id/apply_button>'.
Caused by: java.lang.RuntimeException: Action will not be performed because the target view does not match one or more of the following constraints:
at least 90 percent of the view's area is displayed to the user.

com.northwind.pay.CheckoutFlowTest > appliesPromoCode[Tab_S9U_API_34] FAILED
    (same constraint failure, same coordinates, same target view)

com.northwind.pay.CheckoutFlowTest > placesOrderWithSavedCard[Pixel_2_API_34] FAILED
androidx.test.espresso.NoMatchingViewException: No views in hierarchy found matching: view.getId() is <2131231204/com.northwind.pay:id/order_confirmation>
    View Hierarchy:
    +>DecorView{id=-1, visibility=VISIBLE}
    |
    +->FrameLayout{id=-1}
    |
    +-->NestedScrollView{id=2131231099, res-name=checkout_scroll, visibility=VISIBLE, scrollY=966}
    |
    +-->View{id=2131231255, res-name=upsell_scrim, visibility=VISIBLE, alpha=0.0, clickable=true}
    No exception was raised by the click on place_order_button on this run.
    elapsed: 4.6s

com.northwind.pay.CheckoutFlowTest > placesOrderWithSavedCard[Tab_S9U_API_34] PASSED
com.northwind.pay.CheckoutFlowTest > showsEmptyCartMessage[Pixel_2_API_34] PASSED
com.northwind.pay.CheckoutFlowTest > showsEmptyCartMessage[Tab_S9U_API_34] PASSED

Wall clock, whole class, both configurations: main 4m02s, ivan/checkout-waits 11m18s.

=============== FILE: reports/layout-inspector.md ===============
# Layout inspector capture, CheckoutActivity, 2026-09-08, both images API 34

Both emulator images run at display density 2.0, so 1dp = 2px. Every figure
below is device pixels, measured from the top of the activity content area.

| Configuration  | Screen    | Content area height | Soft keyboard height | Topmost y the keyboard covers |
|----------------|-----------|---------------------|----------------------|-------------------------------|
| Pixel_2_API_34 | 1080x1920 | 1794                | 760                  | 1034                          |
| Tab_S9U_API_34 | 1848x2960 | 2914                | 1440                 | 1474                          |

`checkout_scroll` content height is 2760 on both configurations - the form above
the carousel is fixed height, and the carousel and the upsell rows render the
same on both.

Positions inside the scrolling content, at scrollY = 0:

| View               | y range    |
|--------------------|------------|
| empty_cart_message | 0..96      |
| promo_field        | 1280..1420 |
| apply_button       | 1436..1568 |
| subtotal           | 1584..1660 |
| saved_card_visa    | 1700..1980 |
| upsell_row_0       | 1996..2084 |
| legal_copy         | 2100..2500 |
| place_order_button | 2520..2688 |

Maximum scrollY: 966 on Pixel_2_API_34, 0 on Tab_S9U_API_34 - the content fits
the larger content area, so there is nothing to scroll there.

`upsell_scrim` is the second child of the root `FrameLayout`, drawn after
`checkout_scroll`, and it is positioned against the window rather than the
scrolling content, so its position does not change with scrollY:

| View         | y range on screen (Pixel_2) | y range on screen (Tab_S9U) |
|--------------|-----------------------------|-----------------------------|
| upsell_scrim | 1574..1794                  | 2694..2914                  |

Attributes recorded for `upsell_scrim` at capture time on both configurations:
`visibility=VISIBLE`, `alpha=0.0`, `clickable=true`, `focusable=false`.

`subtotal` renders `22.49 USD` on both configurations when the promo is applied
by hand.

=============== FILE: reports/support-tickets.csv ===============
ticket,opened,device,os,tag,summary
NP-4471,2026-08-26,Pixel 2,Android 14,checkout,"Place order button does nothing. I scroll right to the bottom of the page, tap it, nothing happens. Tried six times."
NP-4478,2026-08-27,Moto G Power 1080x1920,Android 13,checkout,"Cannot complete an order on my phone since last week. The button at the bottom is dead. It worked before."
NP-4483,2026-08-29,Galaxy A13 1080x1920,Android 13,checkout,"Tapping Place order at the bottom of the page does nothing at all. Had to order on the website instead."
NP-4490,2026-09-01,Pixel 7 Pro,Android 15,account,"Cannot change my billing email, the save button spins forever."
NP-4494,2026-09-02,iPad,iPadOS 18,checkout,"Order went through twice and I was charged twice."
NP-4501,2026-09-03,Galaxy Tab S9,Android 14,checkout,"Promo code WELCOME10 says expired but the email says it runs to October."
NP-4509,2026-09-05,Pixel 6a,Android 14,account,"Push notifications stopped arriving after I reinstalled."
NP-4515,2026-09-08,Moto G Power 1080x1920,Android 13,checkout,"Still cannot place an order from the app. Three weeks now."
NP-4520,2026-09-09,Galaxy Tab S9 Ultra,Android 14,checkout,"Would like a saved-address feature, having to retype the address every time."
