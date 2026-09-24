package com.northwind.shop

import android.content.Context
import android.widget.Toast

class WishlistButton(private val context: Context, private val store: WishlistStore) {

    fun onHeartTapped(productId: String) {
        store.add(productId)
        Toast.makeText(context, R.string.wishlist_saved, Toast.LENGTH_SHORT).show()
        WishlistBadge.refresh(store.count())
    }
}
