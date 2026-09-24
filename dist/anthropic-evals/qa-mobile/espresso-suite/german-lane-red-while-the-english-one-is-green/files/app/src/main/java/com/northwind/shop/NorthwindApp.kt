package com.northwind.shop

import android.app.Application

class NorthwindApp : Application() {

    override fun onCreate() {
        super.onCreate()
        PriceFormatter.format(0) // warm up; the first cart render used to stutter
        Telemetry.start(this)
    }
}
