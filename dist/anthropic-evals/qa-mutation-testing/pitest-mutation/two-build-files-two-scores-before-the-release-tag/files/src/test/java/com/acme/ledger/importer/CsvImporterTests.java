package com.acme.ledger.importer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class CsvImporterTests {

    private final CsvImporter importer = new CsvImporter();

    @Test
    void readsAmountsFromTheThirdColumn() {
        assertEquals(List.of(new BigDecimal("12.50"), new BigDecimal("-3.00")),
                importer.amounts(List.of("2026-09-01,ACME,12.50", "2026-09-02,ACME,-3.00")));
    }

    @Test
    void skipsBlankAndCommentRows() {
        assertEquals(List.of(new BigDecimal("1.00")),
                importer.amounts(List.of("", "# header", "2026-09-01,ACME,1.00")));
    }

    @Test
    void rejectsShortRows() {
        assertThrows(IllegalArgumentException.class,
                () -> importer.amounts(List.of("2026-09-01,ACME")));
    }

    @Test
    void sumsTheColumn() {
        assertEquals(new BigDecimal("9.50"),
                importer.sum(List.of("2026-09-01,ACME,12.50", "2026-09-02,ACME,-3.00")));
    }
}
