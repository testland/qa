package com.northwind.auth

import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity

class HomeActivity : AppCompatActivity() {

    private lateinit var store: SessionStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)
        store = SessionStore(this)
        renderRationaleCard()
        renderRecentSearchChips()
        renderSignedInOrSignedOut(store.token() != null)
    }

    private fun renderRationaleCard() {
        findViewById<View>(R.id.notifications_rationale_card).visibility =
            if (NotificationPrompt.shouldShowRationale(this)) View.VISIBLE else View.GONE
    }

    fun onSignedIn(token: String, userId: String) {
        store.saveToken(token)
        store.cacheAvatar(fetchAvatarBytes(userId), userId)
        store.markNotificationsAsked()
        renderSignedInOrSignedOut(true)
    }

    fun onSearchSubmitted(term: String) {
        store.recordSearch(term)
        renderRecentSearchChips()
    }
}
