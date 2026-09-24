package com.northwind.shop

import android.app.Service
import android.content.Intent
import android.os.IBinder

class SyncService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val result = SyncEngine.runOnce()
        if (result.failed) {
            startActivity(
                Intent(this, SyncErrorActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    .putExtra("reason", result.reason)
            )
        }
        return START_NOT_STICKY
    }
}
