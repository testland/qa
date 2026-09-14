package com.acme.ledger.importer;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class CsvImporter {

    public List<BigDecimal> amounts(List<String> lines) {
        List<BigDecimal> out = new ArrayList<>();
        for (String line : lines) {
            if (line.isBlank() || line.startsWith("#")) {
                continue;
            }
            String[] cols = line.split(",", -1);
            if (cols.length < 3) {
                throw new IllegalArgumentException("short row: " + line);
            }
            out.add(new BigDecimal(cols[2].trim()));
        }
        return out;
    }

    public BigDecimal sum(List<String> lines) {
        return amounts(lines).stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
