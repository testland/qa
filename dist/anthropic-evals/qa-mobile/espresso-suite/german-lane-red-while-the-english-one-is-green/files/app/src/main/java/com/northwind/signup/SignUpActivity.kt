package com.northwind.signup

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class SignUpActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_signup)
        findViewById<Button>(R.id.continue_button).setOnClickListener { advance() }
    }

    private fun advance() {
        val name = findViewById<EditText>(R.id.first_name_field).text.toString()
        findViewById<TextView>(R.id.greeting).text = getString(R.string.welcome_greeting, name)
        findViewById<TextView>(R.id.first_year_total).text = PriceFormatter.format(2249, "USD")
        findViewById<View>(R.id.password_step).visibility = View.VISIBLE
    }
}
