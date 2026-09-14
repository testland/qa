package com.northwind.auth

import android.content.Context
import androidx.room.Room
import java.io.File

class SessionStore(private val context: Context) {

    private val prefs = context.getSharedPreferences("session", Context.MODE_PRIVATE)

    private val db = Room.databaseBuilder(context, NorthwindDb::class.java, "northwind.db").build()

    private val avatarDir = File(context.filesDir, "avatars")

    private val onboardingMarker = File(context.filesDir, "onboarding/notifications_asked")

    fun dismissPromoBanner() = prefs.edit().putBoolean("promo_banner_dismissed", true).commit()

    fun promoBannerDismissed(): Boolean = prefs.getBoolean("promo_banner_dismissed", false)

    fun saveToken(token: String) = db.sessionDao().upsert(SessionRow(token))

    fun token(): String? = db.sessionDao().current()?.token

    fun recordSearch(term: String) = db.recentSearchDao().insert(RecentSearch(term))

    fun recentSearches(): List<RecentSearch> = db.recentSearchDao().all()

    fun cacheAvatar(bytes: ByteArray, userId: String) {
        avatarDir.mkdirs()
        File(avatarDir, "$userId.png").writeBytes(bytes)
    }

    fun markNotificationsAsked() {
        onboardingMarker.parentFile?.mkdirs()
        onboardingMarker.createNewFile()
    }

    fun notificationsAlreadyAsked(): Boolean = onboardingMarker.exists()
}
