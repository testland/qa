package com.acme.pricing;

import java.util.Arrays;
import java.util.List;

public final class TierTable {

    private final List<Tier> tiers;

    private TierTable(List<Tier> tiers) {
        this.tiers = tiers;
    }

    /** Callers must pass tiers ordered highest minQty first. */
    public static TierTable of(Tier... tiers) {
        return new TierTable(Arrays.asList(tiers));
    }

    public List<Tier> all() {
        return tiers;
    }
}
