package com.acme.pricing;

public final class RateTable {

    public static final RateTable SHARED = new RateTable(25L);

    private long perItemCents;

    private RateTable(long perItemCents) {
        this.perItemCents = perItemCents;
    }

    public void reload(long perItemCents) {
        this.perItemCents = perItemCents;
    }

    public long perItemCents() {
        return perItemCents;
    }
}
