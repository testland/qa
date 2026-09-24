package com.acme.billing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class InvoiceServiceTest {

    private final InvoiceService service = new InvoiceService();

    @Test
    void chargesFlatShippingBelowTheFreeThreshold() {
        assertEquals(new BigDecimal("4.95"), service.shipping(new BigDecimal("49.99")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"64.00", "80.00", "129.99"})
    void shipsFreeWellAboveTheThreshold(String subtotal) {
        assertEquals(BigDecimal.ZERO, service.shipping(new BigDecimal(subtotal)));
    }

    @ParameterizedTest
    @CsvSource({"100.00, 20", "100.00, 0", "33.33, 27", "80.00, 19", "12.00, 5"})
    void computesVat(String net, int rate) {
        assertNotNull(service.vat(new BigDecimal(net), rate));
    }

    @Test
    void rejectsRatesOutsideTheLegalRange() {
        assertThrows(IllegalArgumentException.class,
                () -> service.vat(new BigDecimal("10.00"), 28));
        assertThrows(IllegalArgumentException.class,
                () -> service.vat(new BigDecimal("10.00"), -1));
    }

    @ParameterizedTest
    @CsvSource({"50.00, 20", "120.00, 20", "10.00, 5"})
    void totalsSubtotalShippingAndVat(String subtotal, int rate) {
        assertNotNull(service.total(new BigDecimal(subtotal), rate));
    }
}
