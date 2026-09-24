package com.acme.settlement;

import java.time.LocalDate;

public class SettlementWindow {

    private static final int CUTOFF_HOUR = 17;

    public static boolean isOpen(LocalDate date, int hour) {
        if (date.getDayOfWeek().getValue() > 5) {
            return false;
        }
        return hour < CUTOFF_HOUR;
    }

    public static LocalDate nextSettlement(LocalDate date) {
        LocalDate next = date.plusDays(1);
        while (next.getDayOfWeek().getValue() > 5) {
            next = next.plusDays(1);
        }
        return next;
    }
}
