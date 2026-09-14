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
