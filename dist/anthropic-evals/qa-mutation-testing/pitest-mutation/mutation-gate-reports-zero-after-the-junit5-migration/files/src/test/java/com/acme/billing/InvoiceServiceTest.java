package com.acme.billing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class InvoiceServiceTest {

    private final InvoiceService service = new InvoiceService();

    @Test
    void chargesFlatShippingBelowTheFreeThreshold() {
        assertEquals(new BigDecimal("4.95"), service.shipping(new BigDecimal("49.99")));
    }

    @Test
    void shipsFreeAboveTheThreshold() {
        assertEquals(BigDecimal.ZERO, service.shipping(new BigDecimal("50.01")));
    }

    @ParameterizedTest
    @CsvSource({"100.00, 20, 20.00", "100.00, 0, 0.00", "33.33, 27, 9.00"})
    void computesVat(String net, int rate, String expected) {
        assertEquals(new BigDecimal(expected), service.vat(new BigDecimal(net), rate));
    }

    @Test
    void rejectsRatesOutsideTheLegalRange() {
        assertThrows(IllegalArgumentException.class,
                () -> service.vat(new BigDecimal("10.00"), 28));
        assertThrows(IllegalArgumentException.class,
                () -> service.vat(new BigDecimal("10.00"), -1));
    }

    @Test
    void totalsSubtotalShippingAndVat() {
        assertEquals(new BigDecimal("65.94"), service.total(new BigDecimal("50.00"), 20));
    }
}
