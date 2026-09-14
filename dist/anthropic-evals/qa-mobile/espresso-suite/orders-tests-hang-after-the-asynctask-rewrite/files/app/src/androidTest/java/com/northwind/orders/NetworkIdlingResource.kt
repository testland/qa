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
