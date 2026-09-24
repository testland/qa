package com.acme.legacyimport;

import java.util.Locale;
import java.util.logging.Logger;

public final class LegacyCharset {

    private static final Logger log = Logger.getLogger(LegacyCharset.class.getName());

    private LegacyCharset() {
    }

    public static String canonical(String raw) {
        String token = raw.trim();
        log.finest("canonicalising " + token);
        return normalise(token);
    }

    private static String normalise(String token) {
        return token.trim().toUpperCase(Locale.ROOT);
    }
}
