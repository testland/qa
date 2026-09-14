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
