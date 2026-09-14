# The checkout tests went green the week we fixed the keyboard problem and I do not trust it

## Problem Description

`com.northwind.shop`, Android, Kotlin. For most of this year the five checkout
instrumentation tests were red about half the time. The symptom was always the
same shape: a tap that should have landed on a button landed on the soft
keyboard instead, and the next assertion blew up with nothing matching.

Tomas spent the last sprint on it. Since build 4620 all five pass on every run
and the job time dropped from eleven minutes to seven. Miriam wants to use that
to retire the manual checkout regression pass before the 19 September release -
it is forty minutes of somebody's Friday and she has wanted it gone since June.

What is nagging me is that two checkout bugs reached customers in the August
release while this job was green, and one of them was in an area I am fairly
sure these tests cover. I asked Tomas to write down what he changed, per test,
and he did; it is attached along with the current test class, the run log from
4620, the log from 4611 (that was the afternoon the staging backend was in
pieces and we ran the job against it anyway), the cart adapter, and the note
from the August manual pass.

Go through it and tell me whether the green means what Miriam thinks it means.
Then fix whatever needs fixing - I would rather have a slower job that tells me
the truth than a fast one that does not.

## Output Specification

1. Edit `app/src/androidTest/java/com/northwind/shop/CheckoutTest.kt` wherever
   your findings call for it. Do not reduce the number of `@Test` methods, and
   do not change `CheckoutActivity`'s ids or layout.
2. Write `docs/checkout-suite-review.md`: take the five tests one at a time,
   say what Tomas changed, say whether that test's green is worth anything, and
   say what you did.
3. Give Miriam a straight answer about the manual regression pass in the same
   document.

## Input Files

Extract the following files before beginning.

=============== FILE: app/src/androidTest/java/com/northwind/shop/CheckoutTest.kt ===============
package com.northwind.shop

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.closeSoftKeyboard
import androidx.test.espresso.action.ViewActions.typeText
import androidx.test.espresso.assertion.ViewAssertions.doesNotExist
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.contrib.RecyclerViewActions
import androidx.test.espresso.matcher.ViewMatchers.hasDescendant
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CheckoutTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(CheckoutActivity::class.java)

    @Test
    fun emailFieldAcceptsPlusAddressing() {
        onView(withId(R.id.email_field))
            .perform(typeText("dana+shop@northwind.test"), closeSoftKeyboard())
        onView(withId(R.id.continue_button)).perform(click())
        onView(withId(R.id.delivery_heading)).check(matches(isDisplayed()))
    }

    @Test
    fun removingAnItemUpdatesTheCart() {
        onView(withId(R.id.cart_list)).perform(
            RecyclerViewActions.actionOnItem<CartAdapter.Row>(
                hasDescendant(withText("Cold Brew Carafe")), click()
            )
        )
        onView(withId(R.id.remove_item_button)).perform(click())
        onView(withText("Cold Brew Carafe")).check(doesNotExist())
    }

    @Test
    fun expiredPromoCodeIsRejected() {
        onView(withId(R.id.promo_field)).perform(typeText("SPRING24"), closeSoftKeyboard())
        onView(withId(R.id.apply_promo_button)).perform(click())
        onView(withId(R.id.promo_error_container)).check(matches(isDisplayed()))
    }

    @Test
    fun placeOrderButtonIsReachableOnASmallScreen() {
        onView(withId(R.id.notes_field)).perform(typeText("leave at door"), closeSoftKeyboard())
        Thread.sleep(2000)
        onView(withId(R.id.place_order_button)).perform(click())
        onView(withId(R.id.order_confirmation)).check(matches(isDisplayed()))
    }

    @Ignore("unstable since the keyboard work - NW-2291")
    @Test
    fun deliveryDateAppearsAfterAddressEntry() {
        onView(withId(R.id.postcode_field)).perform(typeText("EC1A 1BB"), closeSoftKeyboard())
        onView(withId(R.id.continue_button)).perform(click())
        onView(withId(R.id.delivery_date)).check(matches(withText("Thu 18 Sep")))
    }
}

=============== FILE: reports/checkout-changes.md ===============
# What I changed, per test - Tomas, 2026-09-08

**emailFieldAcceptsPlusAddressing.** The Continue tap was landing on the
keyboard. Chained the close-keyboard action onto the end of the typing action.
Nothing else touched. Green ever since, including on the small device.

**removingAnItemUpdatesTheCart.** This one used to assert the row was no longer
displayed and kept matching the row anyway, because the list rebinds its rows
after a removal and the matcher found a recycled one. Switched the check to
"does not exist" on the product name, which is stable.

**expiredPromoCodeIsRejected.** It asserted the exact error copy. Marketing
changed that string twice in one sprint and broke the test both times, so I now
assert that the error container is displayed. The container is the thing that
matters - if it is up, the code was refused.

**placeOrderButtonIsReachableOnASmallScreen.** Closing the keyboard was not
enough on the 5.0" device: the retract animation is still running when the tap
goes out. Two seconds of sleep before the tap fixed it. Not elegant but it has
not failed once in three weeks.

**deliveryDateAppearsAfterAddressEntry.** Went unstable right after the keyboard
work and I could not get to the bottom of it before the sprint ended. Ignored it
and raised NW-2291. Nobody has picked it up.

=============== FILE: reports/build-4620.txt ===============
### Build 4620 - 2026-09-09, Pixel 4a emulator, API 34, 1080x2340

com.northwind.shop.CheckoutTest > emailFieldAcceptsPlusAddressing PASSED (2.4s)
com.northwind.shop.CheckoutTest > removingAnItemUpdatesTheCart PASSED (3.1s)
com.northwind.shop.CheckoutTest > expiredPromoCodeIsRejected PASSED (2.0s)
com.northwind.shop.CheckoutTest > placeOrderButtonIsReachableOnASmallScreen PASSED (4.3s)
com.northwind.shop.CheckoutTest > deliveryDateAppearsAfterAddressEntry SKIPPED

5 tests, 4 passed, 0 failed, 1 skipped

Nightly history since 4620: 21 consecutive runs, no failures in this class.

=============== FILE: reports/build-4611-broken-backend.txt ===============
### Build 4611 - 2026-09-02

Staging was in a bad state all afternoon (cert rotation went wrong upstream) and
the job was launched against it by mistake before anyone noticed. Kept for the
record. What staging was doing at the time, from the gateway log:

- POST /v1/cart/{id}/remove  -> 500 on every call, 0 successful removals
- POST /v1/promo/validate    -> returned {"status":"UNKNOWN_CODE"} for every
                                code submitted, valid ones included
- GET  /v1/delivery/estimate -> connection refused
- POST /v1/orders            -> 201, this one was healthy

Instrumentation result:

com.northwind.shop.CheckoutTest > emailFieldAcceptsPlusAddressing PASSED (2.5s)
com.northwind.shop.CheckoutTest > removingAnItemUpdatesTheCart PASSED (3.2s)
com.northwind.shop.CheckoutTest > expiredPromoCodeIsRejected PASSED (2.1s)
com.northwind.shop.CheckoutTest > placeOrderButtonIsReachableOnASmallScreen PASSED (4.2s)
com.northwind.shop.CheckoutTest > deliveryDateAppearsAfterAddressEntry SKIPPED

5 tests, 4 passed, 0 failed, 1 skipped

=============== FILE: app/src/main/java/com/northwind/shop/CartAdapter.kt ===============
package com.northwind.shop

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView

class CartAdapter(
    private val recycler: RecyclerView,
    private val onRowTapped: (CartLine) -> Unit
) : RecyclerView.Adapter<CartAdapter.Row>() {

    private val lines = mutableListOf<CartLine>()

    class Row(view: android.view.View) : RecyclerView.ViewHolder(view)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Row =
        Row(LayoutInflater.from(parent.context).inflate(R.layout.cart_row, parent, false))

    override fun onBindViewHolder(holder: Row, position: Int) {
        val line = lines[position]
        holder.itemView.findViewById<android.widget.TextView>(R.id.cart_row_title).text = line.title
        holder.itemView.findViewById<android.widget.TextView>(R.id.cart_row_price).text = line.price
        holder.itemView.setOnClickListener { onRowTapped(line) }
    }

    override fun getItemCount(): Int = lines.size

    fun refresh(fresh: List<CartLine>) {
        lines.clear()
        lines.addAll(fresh)
        notifyDataSetChanged()
        recycler.scrollToPosition(0)
    }
}

=============== FILE: reports/cart-fixture.md ===============
# The seeded checkout cart the instrumentation job runs against

Twelve lines, always in this order, seeded before every run:

| # | Title                 | Price  |
|---|-----------------------|--------|
| 1 | Filter Papers x100    | £4.50  |
| 2 | Hand Grinder          | £38.00 |
| 3 | Scales                | £24.00 |
| 4 | Espresso Cups x2      | £16.00 |
| 5 | Tamper                | £12.00 |
| 6 | Cleaning Tablets      | £7.25  |
| 7 | Milk Jug              | £9.00  |
| 8 | Kettle Spout          | £14.50 |
| 9 | Cold Brew Carafe      | £21.00 |
|10 | Travel Mug            | £11.00 |
|11 | Storage Tin           | £6.75  |
|12 | Bean Scoop            | £3.20  |

The cart screen on the CI device shows four rows at a time; the rest are
reachable by scrolling. The subtotal label (`R.id.cart_subtotal`) and the line
counter (`R.id.cart_line_count`) sit in a fixed header above the list and are
attached for the whole life of the screen.

After a successful removal the server returns the new cart and the screen calls
`CartAdapter.refresh(...)`.

=============== FILE: reports/manual-pass-2026-08.md ===============
# Manual checkout regression - August release, findings

Two defects reached customers in 2026-08 and both were caught here first, after
the instrumentation job had already gone green on the same build:

- **NW-2244** - an expired promotional code was accepted at checkout and applied
  a discount. Reproduced on build 4571. The screen did show the red error strip
  underneath the promo field at the same time; the discount was applied anyway.
  Fixed in 4588.
- **NW-2251** - the delivery estimate did not appear for postcodes outside
  London. Not covered by any automated test.

Time cost of the pass: 40 minutes, one person, once per release candidate.
