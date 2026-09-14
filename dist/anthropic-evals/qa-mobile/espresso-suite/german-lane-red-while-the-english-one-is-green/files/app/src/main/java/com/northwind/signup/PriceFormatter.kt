package com.northwind.signup

import java.text.NumberFormat
import java.util.Currency
import java.util.Locale

object PriceFormatter {

    fun format(amountMinor: Long, currency: String, locale: Locale = Locale.getDefault()): String {
        val nf = NumberFormat.getCurrencyInstance(locale)
        nf.currency = Currency.getInstance(currency)
        return nf.format(amountMinor / 100.0)
    }
}
