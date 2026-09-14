package com.acme.pricing;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class PriceCalculatorTest {

    // tiers are ordered highest minQty first, as TierTable.of requires
    private final TierTable tiers = TierTable.of(new Tier(100, 10), new Tier(50, 5));
    private final Contract contract = new Contract("EUR", "ACME-2026");
    private final PriceCalculator calc = new PriceCalculator(tiers, contract);

    @Test
    void lineTotalMultiplies() {
        assertEquals(2000L, calc.lineTotalCents(4, 500L));
    }

    @Test
    void lineTotalCapsHugeQuantities() {
        assertEquals(499500L, calc.lineTotalCents(5000, 500L));
    }

    @Test
    void tierDiscountForLargeOrder() {
        assertEquals(10, calc.tierDiscountPercent(120));
    }

    @Test
    void noTierDiscountForSmallOrder() {
        assertEquals(0, calc.tierDiscountPercent(3));
    }

    @Test
    void feeForTenItems() {
        assertEquals(250L, calc.handlingFeeCents(10));
    }

    @Test
    void noFeeAboveTen() {
        assertEquals(0L, calc.handlingFeeCents(11));
    }
}
