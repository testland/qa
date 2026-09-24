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
