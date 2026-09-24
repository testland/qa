package com.acme.billing;

import java.math.BigDecimal;
import java.math.RoundingMode;

public class InvoiceService {

    private static final BigDecimal FREE_SHIPPING_FROM = new BigDecimal("50.00");
    private static final BigDecimal SHIPPING_FLAT = new BigDecimal("4.95");

    public BigDecimal shipping(BigDecimal subtotal) {
        if (subtotal.compareTo(FREE_SHIPPING_FROM) >= 0) {
            return BigDecimal.ZERO;
        }
        return SHIPPING_FLAT;
    }

    public BigDecimal vat(BigDecimal net, int ratePercent) {
        if (ratePercent < 0 || ratePercent > 27) {
            throw new IllegalArgumentException("rate out of range: " + ratePercent);
        }
        return net.multiply(BigDecimal.valueOf(ratePercent))
                  .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    public BigDecimal total(BigDecimal subtotal, int ratePercent) {
        BigDecimal net = subtotal.add(shipping(subtotal));
        return net.add(vat(net, ratePercent)).setScale(2, RoundingMode.HALF_UP);
    }
}
