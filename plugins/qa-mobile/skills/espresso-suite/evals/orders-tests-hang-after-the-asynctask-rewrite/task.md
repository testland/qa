# One orders test fails in a third of a second and the other sits there for twenty-six, both since we deleted the last AsyncTask

## Problem Description

`com.northwind.orders`, Android, Kotlin. `OrdersListTest` had been green for
about two years. On 28 August we finished moving the last of our networking off
`AsyncTask` onto Retrofit and OkHttp, and the same commit added the little status
chip that ticks on the order detail screen. Nothing about the layouts changed -
same ids, same view types, same strings - and from that build on two of the three
tests have been red.

They are red in two different ways and I think that matters, but nobody here has
been able to say why.

`loadsOrdersForReturningCustomer` blows up in under half a second with nothing
in the hierarchy. `showsRefundBadgeOnRefundedOrder` does not blow up at all; it
sits for twenty-six seconds and then throws something about idle conditions. The
third test still passes and I would like it to stay that way.

Priya spent last week on it. She followed a blog post and added a
`NetworkIdlingResource`, wired it up, and it made no difference at all - the same
test still fails instantly and the same test still hangs. Her proposal this
morning is to delete her class and put `Thread.sleep(3000)` in front of each
assertion, on the grounds that this is what we had before 2019, it was green for
years, three seconds is longer than any call we make, and she has spent long
enough on it. Karim's counter-proposal is to keep the class and raise the idle
timeout to ninety seconds so at least the slow one gets a chance to finish.

I do not think either of them is right and I cannot articulate why. Sprint review
is Thursday.

Attached: the test class, Priya's class, the repository, the ticker and the
detail activity, the module build file, a summary of what the migration changed,
and the instrumentation output from before it, after it, and after Priya's fix,
with the logcat from the hanging test and the gateway timings.

## Output Specification

1. Get all three tests in `OrdersListTest` reporting correctly. Do not delete or
   weaken an assertion, and do not remove a test.
2. You may change production code under `app/src/main/`.
3. Write `docs/orders-async-fix.md` for a reviewer who has never read this
   framework's documentation: why each of the two failures has the cause it has,
   why they are not the same problem, and what you did with each of the two
   proposals on the table.

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

=============== FILE: app/src/main/java/com/northwind/orders/NetworkIdlingResource.kt ===============
package com.northwind.orders

import androidx.test.espresso.IdlingResource
import java.util.concurrent.atomic.AtomicInteger

class NetworkIdlingResource : IdlingResource {

    private val pending = AtomicInteger(0)
    @Volatile private var callback: IdlingResource.ResourceCallback? = null

    override fun getName(): String = "NetworkIdlingResource"

    override fun isIdleNow(): Boolean = pending.get() == 0

    override fun registerIdleTransitionCallback(cb: IdlingResource.ResourceCallback?) {
        callback = cb
    }

    fun increment() {
        pending.incrementAndGet()
    }

    fun decrement() {
        if (pending.decrementAndGet() == 0) callback?.onTransitionToIdle()
    }
}

=============== FILE: app/src/main/java/com/northwind/orders/OrdersRepository.kt ===============
package com.northwind.orders

import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class OrdersRepository(private val api: OrdersApi) {

    companion object {
        val idling = NetworkIdlingResource()
    }

    fun loadOrders(onResult: (List<Order>) -> Unit, onError: (Throwable) -> Unit) {
        idling.increment()
        api.orders().enqueue(object : Callback<List<Order>> {
            override fun onResponse(call: Call<List<Order>>, response: Response<List<Order>>) {
                onResult(response.body().orEmpty())
                idling.decrement()
            }

            override fun onFailure(call: Call<List<Order>>, t: Throwable) {
                onError(t)
            }
        })
    }

    fun loadOrderDetail(id: String, onResult: (OrderDetail) -> Unit, onError: (Throwable) -> Unit) {
        idling.increment()
        api.orderDetail(id).enqueue(object : Callback<OrderDetail> {
            override fun onResponse(call: Call<OrderDetail>, response: Response<OrderDetail>) {
                val body = response.body()
                if (body != null) onResult(body) else onError(IllegalStateException("empty body"))
                idling.decrement()
            }

            override fun onFailure(call: Call<OrderDetail>, t: Throwable) {
                onError(t)
            }
        })
    }
}

=============== FILE: app/src/main/java/com/northwind/orders/OrderStatusTicker.kt ===============
package com.northwind.orders

import android.os.Handler
import android.util.Log

class OrderStatusTicker(
    private val handler: Handler,
    private val onTick: () -> Unit
) : Runnable {

    fun start() {
        handler.post(this)
    }

    override fun run() {
        Log.d("OrderStatusTicker", "tick")
        onTick()
        handler.post(this)
    }

    fun stop() {
        handler.removeCallbacks(this)
    }
}

=============== FILE: app/src/main/java/com/northwind/orders/OrderDetailActivity.kt ===============
package com.northwind.orders

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.appcompat.app.AppCompatActivity

class OrderDetailActivity : AppCompatActivity() {

    private lateinit var ticker: OrderStatusTicker

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_order_detail)
        ticker = OrderStatusTicker(Handler(Looper.getMainLooper())) { refreshStatusChip() }
    }

    override fun onStart() {
        super.onStart()
        ticker.start()
    }

    override fun onStop() {
        ticker.stop()
        super.onStop()
    }

    private fun refreshStatusChip() = Unit
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
    implementation 'androidx.test.espresso:espresso-idling-resource:3.6.1'

    androidTestImplementation 'androidx.test.ext:junit:1.2.1'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.6.1'
}

=============== FILE: reports/androidTest-4502.txt ===============
### Build 4470 - 2026-08-27, last build before the migration merged

com.northwind.orders.OrdersListTest > loadsOrdersForReturningCustomer PASSED (2.2s)
com.northwind.orders.OrdersListTest > showsRefundBadgeOnRefundedOrder PASSED (2.6s)
com.northwind.orders.OrdersListTest > showsEmptyStateForNewAccount PASSED (0.9s)

### Build 4471 - 2026-08-28, immediately after the migration merged

com.northwind.orders.OrdersListTest > loadsOrdersForReturningCustomer FAILED
androidx.test.espresso.NoMatchingViewException: No views in hierarchy found matching:
view.getId() is <2131231301/com.northwind.orders:id/order_row_0>
    View Hierarchy:
    +->RecyclerView{id=2131231299, res-name=orders_list, visibility=VISIBLE, child-count=0}
    elapsed: 0.41s

com.northwind.orders.OrdersListTest > showsRefundBadgeOnRefundedOrder FAILED
androidx.test.espresso.AppNotIdleException: Looped for 8619 iterations over 26 SECONDS.
The following Idle Conditions failed: MAIN_LOOPER_HAS_IDLED.
    elapsed: 26.0s

com.northwind.orders.OrdersListTest > showsEmptyStateForNewAccount PASSED (0.9s)

### Build 4502 - 2026-09-09, after NetworkIdlingResource was added and registered

com.northwind.orders.OrdersListTest > loadsOrdersForReturningCustomer FAILED
androidx.test.espresso.NoMatchingViewException: No views in hierarchy found matching:
view.getId() is <2131231301/com.northwind.orders:id/order_row_0>
    View Hierarchy:
    +->RecyclerView{id=2131231299, res-name=orders_list, visibility=VISIBLE, child-count=0}
    elapsed: 0.38s

com.northwind.orders.OrdersListTest > showsRefundBadgeOnRefundedOrder FAILED
androidx.test.espresso.AppNotIdleException: Looped for 8931 iterations over 26 SECONDS.
The following Idle Conditions failed: MAIN_LOOPER_HAS_IDLED.
    elapsed: 26.0s

com.northwind.orders.OrdersListTest > showsEmptyStateForNewAccount PASSED (0.9s)

### logcat, build 4502, captured during showsRefundBadgeOnRefundedOrder

09-09 02:14:07.118 D/OrderStatusTicker: tick
09-09 02:14:07.121 D/OrderStatusTicker: tick
09-09 02:14:07.123 D/OrderStatusTicker: tick
09-09 02:14:07.126 D/OrderStatusTicker: tick
09-09 02:14:07.128 D/OrderStatusTicker: tick
... 8926 further lines, same tag, spacing 2-4 ms, up to the point the test threw

### gateway, same build, same emulator

GET /v1/orders                 -> 200 in 612 ms
GET /v1/orders/NW-10042        -> 200 in 488 ms
GET /v1/orders/NW-10091        -> 404 in 501 ms

=============== FILE: reports/migration-summary.md ===============
# What the 2026-08-28 commit changed

Removed from `OrdersRepository`:

```
private class FetchOrdersTask(...) : AsyncTask<Void, Void, List<Order>>() {
    override fun doInBackground(vararg p: Void?): List<Order> = api.ordersBlocking()
    override fun onPostExecute(result: List<Order>) = onResult(result)
}
```

Added: the Retrofit `enqueue` call sites now in `OrdersRepository.kt`, and
`OrderStatusTicker`, which exists to refresh the status chip on the detail
screen on a five second cadence while that screen is in front of the user.

Unchanged in that commit:

- `activity_orders.xml` and `activity_order_detail.xml` - same ids, same view
  types, same `RecyclerView`.
- `OrdersActivity` still constructs the repository in `onCreate` and still calls
  `repository.loadOrders { adapter.submit(it) }` from `onStart`. Tapping a row
  starts `OrderDetailActivity`, which calls `repository.loadOrderDetail(...)`.
- The API responses and the seeded test data. The detail record for one of the
  three seeded orders is still missing upstream, which is why one of the gateway
  lines above is a 404; it has been that way since before the migration and the
  screen has always shown an error state for it.
- Every other class under `androidTest`, all still green.
