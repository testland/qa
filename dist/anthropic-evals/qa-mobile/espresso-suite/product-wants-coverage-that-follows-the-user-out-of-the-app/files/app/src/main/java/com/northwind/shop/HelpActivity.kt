package com.northwind.shop

import android.os.Bundle
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity

class HelpActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_help)
        val web = findViewById<WebView>(R.id.help_web_view)
        web.settings.javaScriptEnabled = true
        web.webViewClient = SupportFormInterceptingClient(this)
        web.loadUrl("https://help.northwind.example/app")
    }
}
