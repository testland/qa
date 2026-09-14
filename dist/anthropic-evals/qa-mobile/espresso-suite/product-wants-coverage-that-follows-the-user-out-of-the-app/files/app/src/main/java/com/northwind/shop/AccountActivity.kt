package com.northwind.shop

import android.os.Bundle
import android.view.View
import androidx.fragment.app.FragmentActivity
import java.util.concurrent.Executors

class AccountActivity : FragmentActivity() {

    private lateinit var vaultUnlock: VaultUnlock

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_account)
        vaultUnlock = VaultUnlock(this, Executors.newSingleThreadExecutor()) { revealSavedCards() }
        findViewById<View>(R.id.unlock_saved_cards_button).setOnClickListener { vaultUnlock.start() }
    }

    private fun revealSavedCards() {
        runOnUiThread { findViewById<View>(R.id.saved_cards_root).visibility = View.VISIBLE }
    }
}
