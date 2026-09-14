package com.northwind.shop

import android.content.Context
import android.content.Intent

object ReceiptShare {

    fun share(context: Context, order: Order) {
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, "Northwind receipt ${order.number}")
            putExtra(Intent.EXTRA_TEXT, "Total: ${order.total}")
        }
        context.startActivity(Intent.createChooser(send, "Share receipt"))
    }
}
