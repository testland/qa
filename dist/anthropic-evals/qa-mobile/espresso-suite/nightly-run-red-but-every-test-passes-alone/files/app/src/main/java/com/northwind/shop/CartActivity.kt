package com.northwind.shop

import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle

class CartActivity : AppCompatActivity() {

    private lateinit var repository: CartRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_cart)
        repository = CartRepository(Api.cart)
        findViewById<android.view.View>(R.id.qty_increment).setOnClickListener {
            repository.changeQuantity("line-1", 2)
            render()
        }
    }

    override fun onPause() {
        super.onPause()
        if (repository.hasPendingEdits()) repository.syncPendingChanges()
    }

    private fun render() = Unit
}
