package com.northwind.auth

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat

object NotificationPrompt {

    fun shouldShowRationale(context: Context): Boolean =
        !SessionStore(context).notificationsAlreadyAsked() &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
}
