package com.acme.legacyimport;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.logging.Logger;

public class RowParser {

    private static final Logger log = Logger.getLogger(RowParser.class.getName());
    private static final int LONG_ROW = 132;

    private int skipped;

    public List<String> parse(String raw, int columns) {
        if (raw == null) {
            throw new ParseException("row is null");
        }
        Objects.requireNonNull(raw, "raw");
        int width = Math.max(1, columns);
        List<String> out = new ArrayList<>();
        for (int i = 0; i < raw.length(); i += width) {
            out.add(raw.substring(i, Math.min(raw.length(), i + width)));
        }
        if (raw.length() > LONG_ROW) {
            skipped++;
        }
        log.fine("parsed " + out.size() + " columns, skipped " + skipped);
        return out;
    }

    public String field(List<String> row, int index) {
        if (index < 0 || index >= row.size()) {
            throw new ParseException("no column " + index);
        }
        return row.get(index).trim();
    }
}
