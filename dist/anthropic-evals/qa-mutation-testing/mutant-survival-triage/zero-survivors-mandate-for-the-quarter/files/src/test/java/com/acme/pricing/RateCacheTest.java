package com.acme.pricing;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class RateCacheTest {

    @Test
    void reloadReplacesThePerItemRate() {
        RateTable.SHARED.reload(40L);
        assertEquals(40L, RateTable.SHARED.perItemCents());
        RateTable.SHARED.reload(25L);
    }
}
