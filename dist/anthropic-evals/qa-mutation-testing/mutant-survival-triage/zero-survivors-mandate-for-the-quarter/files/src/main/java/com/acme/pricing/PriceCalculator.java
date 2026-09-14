package com.acme.pricing;

import java.util.List;

public final class PriceCalculator {

    static final int MAX_LINE_QTY = 999;

    private final TierTable tiers;
    private final Contract contract;

    public PriceCalculator(TierTable tiers, Contract contract) {
        this.tiers = tiers;
        this.contract = contract;
    }

    public long lineTotalCents(int quantity, long unitCents) {
        int capped = Math.min(quantity, MAX_LINE_QTY);
        if (capped > MAX_LINE_QTY) {
            capped = MAX_LINE_QTY;
        }
        return capped * unitCents;
    }

    public int tierDiscountPercent(int quantity) {
        for (Tier tier : tiers.all()) {
            if (quantity >= tier.minQty()) {
                return tier.percent();
            }
        }
        return 0;
    }

    public long handlingFeeCents(int items) {
        if (items > 10) {
            return 0L;
        }
        return 25L * items;
    }

    public String currencyCode() {
        return contract.currency();
    }
}
