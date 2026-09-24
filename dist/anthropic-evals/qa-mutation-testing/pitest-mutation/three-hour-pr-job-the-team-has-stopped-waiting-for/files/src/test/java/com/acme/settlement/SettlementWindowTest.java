package com.acme.settlement;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class SettlementWindowTest {

    @Test
    void openOnAWeekdayMorning() {
        assertTrue(SettlementWindow.isOpen(LocalDate.of(2026, 9, 9), 9));
    }

    @Test
    void closedAfterCutoff() {
        assertFalse(SettlementWindow.isOpen(LocalDate.of(2026, 9, 9), 17));
    }

    @Test
    void closedAtTheWeekend() {
        assertFalse(SettlementWindow.isOpen(LocalDate.of(2026, 9, 12), 9));
    }

    @Test
    void skipsTheWeekendWhenFindingTheNextSettlement() {
        assertEquals(LocalDate.of(2026, 9, 14), SettlementWindow.nextSettlement(LocalDate.of(2026, 9, 11)));
    }
}
