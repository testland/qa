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
