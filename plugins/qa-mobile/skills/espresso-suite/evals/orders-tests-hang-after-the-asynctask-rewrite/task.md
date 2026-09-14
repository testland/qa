# Orders screen tests broke the day we deleted the last AsyncTask, and the attempted fix made the job hang

## Problem Description

Context: `com.northwind.orders`, Android, Kotlin. `OrdersListTest` was green for
about two years. On 2026-08-28 we finished migrating the last of our networking
off `AsyncTask` onto Retrofit + OkHttp. Nothing about the screen changed - same
layout, same row ids, same strings - and from that build on, the two tests that
touch the order list fail.

The first failure mode was fast and obvious: the assertion ran before any rows
were on screen and blew up with nothing in the hierarchy. Priya spent a day on
it last week, followed a blog post, and added `NetworkIdlingResource`. Now the
tests do not fail fast any more, they sit there for twenty-six seconds each and
then throw something about waiting for the thing to become idle. So the job went
from four minutes to thirteen and is still red, which is worse on both counts.

Priya's proposal this morning is to delete her class and put `Thread.sleep(3000)`
in front of each assertion. Her argument is that it is what we had before 2019,
it was green for years, three seconds is longer than any call we make, and she
has spent long enough on this. Karim's counter-proposal is to keep the class and
raise the idle timeout to sixty seconds. I do not think either of them is right
but I cannot articulate why, and I would like the tests green before the sprint
review on Thursday.

Attached: the test class, Priya's class, the repository that does the fetching,
the module build file, a summary of what the migration actually changed, and the
instrumentation output from before and after her change.

## Output Specification

1. Make `loadsOrdersForReturningCustomer` and `showsRefundBadgeOnRefundedOrder`
   pass, without fixed waits and without raising any timeout.
2. Do not modify the body of `showsEmptyStateForNewAccount`, and do not weaken
   or delete any assertion in the class.
3. Write `docs/orders-async-fix.md` that explains, to a reviewer who has never
   read this framework's documentation, why these two tests broke on 2026-08-28
   and why neither proposal on the table is the answer.

## Input Files

Extract the following files before beginning.

=============== FILE: app/src/androidTest/java/com/northwind/orders/OrdersListTest.kt ===============
package com.northwind.orders

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.IdlingRegistry
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class OrdersListTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(OrdersActivity::class.java)

    private lateinit var idling: NetworkIdlingResource

    @Before
    fun setUp() {
        idling = NetworkIdlingResource()
        IdlingRegistry.getInstance().register(idling)
        idling.increment()
    }

    @Test
    fun showsEmptyStateForNewAccount() {
        onView(withId(R.id.empty_orders_message)).check(matches(isDisplayed()))
    }

    @Test
    fun loadsOrdersForReturningCustomer() {
        onView(withId(R.id.order_row_0)).check(matches(isDisplayed()))
    }

    @Test
    fun showsRefundBadgeOnRefundedOrder() {
        onView(withId(R.id.order_row_2)).perform(click())
        onView(withId(R.id.status_badge)).check(matches(withText("Refunded")))
    }
}

=============== FILE: app/src/androidTest/java/com/northwind/orders/NetworkIdlingResource.kt ===============
package com.northwind.orders

import androidx.test.espresso.IdlingResource
import java.util.concurrent.atomic.AtomicInteger

class NetworkIdlingResource : IdlingResource {

    private val pending = AtomicInteger(0)

    override fun getName(): String = "NetworkIdlingResource"

    override fun isIdleNow(): Boolean = pending.get() == 0

    override fun registerIdleTransitionCallback(callback: IdlingResource.ResourceCallback?) {
    }

    fun increment() {
        pending.incrementAndGet()
    }

    fun decrement() {
        pending.decrementAndGet()
    }
}

=============== FILE: app/src/main/java/com/northwind/orders/OrdersRepository.kt ===============
package com.northwind.orders

import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class OrdersRepository(private val api: OrdersApi) {

    fun loadOrders(onResult: (List<Order>) -> Unit, onError: (Throwable) -> Unit) {
        api.orders().enqueue(object : Callback<List<Order>> {
            override fun onResponse(call: Call<List<Order>>, response: Response<List<Order>>) {
                onResult(response.body().orEmpty())
            }

            override fun onFailure(call: Call<List<Order>>, t: Throwable) {
                onError(t)
            }
        })
    }

    fun loadOrderDetail(id: String, onResult: (OrderDetail) -> Unit, onError: (Throwable) -> Unit) {
        api.orderDetail(id).enqueue(object : Callback<OrderDetail> {
            override fun onResponse(call: Call<OrderDetail>, response: Response<OrderDetail>) {
                response.body()?.let(onResult) ?: onError(IllegalStateException("empty body"))
            }

            override fun onFailure(call: Call<OrderDetail>, t: Throwable) {
                onError(t)
            }
        })
    }
}

=============== FILE: app/build.gradle ===============
plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.northwind.orders'
    compileSdk 35

    defaultConfig {
        applicationId "com.northwind.orders"
        minSdk 24
        targetSdk 35
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
}

dependencies {
    implementation 'com.squareup.retrofit2:retrofit:2.11.0'
    implementation 'com.squareup.retrofit2:converter-moshi:2.11.0'
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'

    androidTestImplementation 'androidx.test.ext:junit:1.2.1'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.6.1'
}

=============== FILE: reports/androidTest-failure.txt ===============
### Build 4470 - 2026-08-27, last build before the networking migration merged

com.northwind.orders.OrdersListTest > loadsOrdersForReturningCustomer PASSED (2.2s)
com.northwind.orders.OrdersListTest > showsRefundBadgeOnRefundedOrder PASSED (2.6s)
com.northwind.orders.OrdersListTest > showsEmptyStateForNewAccount PASSED (0.9s)

### Build 4471 - 2026-08-28, immediately after the networking migration merged

com.northwind.orders.OrdersListTest > loadsOrdersForReturningCustomer FAILED
androidx.test.espresso.NoMatchingViewException: No views in hierarchy found matching: view.getId() is <2131231301/com.northwind.orders:id/order_row_0>
    View Hierarchy:
    +>DecorView{id=-1, visibility=VISIBLE, ...}
    |
    +->LinearLayout{id=-1, ...}
    |
    +-->RecyclerView{id=2131231299, res-name=orders_list, visibility=VISIBLE, child-count=0}
    elapsed: 0.41s

com.northwind.orders.OrdersListTest > showsRefundBadgeOnRefundedOrder FAILED
androidx.test.espresso.NoMatchingViewException: No views in hierarchy found matching: view.getId() is <2131231303/com.northwind.orders:id/order_row_2>
    elapsed: 0.38s

com.northwind.orders.OrdersListTest > showsEmptyStateForNewAccount PASSED (0.9s)

### Build 4502 - 2026-09-09, after NetworkIdlingResource was added

com.northwind.orders.OrdersListTest > loadsOrdersForReturningCustomer FAILED
androidx.test.espresso.IdlingResourceTimeoutException: Wait for [NetworkIdlingResource] to become idle timed out
    at androidx.test.espresso.base.UiControllerImpl.loopUntil(UiControllerImpl.java:472)
    elapsed: 26.1s

com.northwind.orders.OrdersListTest > showsRefundBadgeOnRefundedOrder FAILED
androidx.test.espresso.IdlingResourceTimeoutException: Wait for [NetworkIdlingResource] to become idle timed out
    elapsed: 26.0s

com.northwind.orders.OrdersListTest > showsEmptyStateForNewAccount FAILED
androidx.test.espresso.IdlingResourceTimeoutException: Wait for [NetworkIdlingResource] to become idle timed out
    elapsed: 26.0s

### Timing captured with a logging interceptor, same build, same emulator

GET /v1/orders                 -> 200 in 612 ms   (OkHttp dispatcher thread OkHttp Dispatcher-3)
GET /v1/orders/NW-10042        -> 200 in 488 ms   (OkHttp dispatcher thread OkHttp Dispatcher-1)
GET /v1/orders/NW-10091        -> 404 in 501 ms   (OkHttp dispatcher thread OkHttp Dispatcher-2)
callback delivered to main thread 3-9 ms after the response completes

=============== FILE: reports/migration-diff-summary.md ===============
# What the 2026-08-28 migration changed

Removed, from `OrdersRepository`:

```
private class FetchOrdersTask(...) : AsyncTask<Void, Void, List<Order>>() {
    override fun doInBackground(vararg p: Void?): List<Order> = api.ordersBlocking()
    override fun onPostExecute(result: List<Order>) = onResult(result)
}
```

Added: the Retrofit `enqueue` call sites now in `OrdersRepository.kt`.

Nothing else changed. Specifically unchanged:

- `activity_orders.xml` - same ids, same view types, same `RecyclerView`.
- `OrdersActivity` - still constructs the repository in `onCreate` and still
  calls `repository.loadOrders { adapter.submit(it) }` from `onStart`, on the
  main thread. Tapping a row calls `repository.loadOrderDetail(...)`.
- The API responses, the fixtures the emulator talks to, and the test data. The
  detail fixture for one of the three seeded orders is still missing upstream,
  which is why one of the interceptor lines above is a 404.
- Every other test class in `androidTest`, all still green.
