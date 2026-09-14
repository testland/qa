package com.northwind.shop

import java.text.NumberFormat
import java.util.Locale

object PriceFormatter {

    private val currency: NumberFormat = NumberFormat.getCurrencyInstance(Locale.getDefault())

    fun format(amountMinor: Long): String = currency.format(amountMinor / 100.0)
}
