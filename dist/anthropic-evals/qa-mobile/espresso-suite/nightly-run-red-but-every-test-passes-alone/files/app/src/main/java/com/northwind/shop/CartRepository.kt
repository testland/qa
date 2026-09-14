package com.northwind.shop

import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class CartRepository(private val api: CartApi) {

    private var pendingEdits = false

    fun hasPendingEdits(): Boolean = pendingEdits

    fun changeQuantity(lineId: String, qty: Int) {
        pendingEdits = true
    }

    fun syncPendingChanges() {
        CartNetworkIdling.increment()
        api.sync().enqueue(object : Callback<CartState> {
            override fun onResponse(call: Call<CartState>, response: Response<CartState>) {
                pendingEdits = false
                CartNetworkIdling.decrement()
            }

            override fun onFailure(call: Call<CartState>, t: Throwable) {
                Telemetry.warn("cart sync failed", t)
            }
        })
    }
}
