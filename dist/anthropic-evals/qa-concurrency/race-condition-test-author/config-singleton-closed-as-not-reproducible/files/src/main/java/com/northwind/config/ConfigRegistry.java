package com.northwind.config;

import java.util.HashMap;
import java.util.Map;

/** Process-wide service endpoint registry. Reloaded every refreshSeconds. */
public final class ConfigRegistry {

    private static ConfigRegistry instance;

    private Map<String, String> endpoints = new HashMap<>();
    private int refreshSeconds;

    private ConfigRegistry() {
        reload();
    }

    public static ConfigRegistry get() {
        if (instance == null) {
            synchronized (ConfigRegistry.class) {
                if (instance == null) {
                    instance = new ConfigRegistry();
                }
            }
        }
        return instance;
    }

    /** Re-reads endpoints. Also called by the background refresh task. */
    public void reload() {
        Map<String, String> next = new HashMap<>();
        next.put("billing", "https://billing.internal:8443");
        next.put("ledger", "https://ledger.internal:8443");
        next.put("notify", "https://notify.internal:8443");
        this.endpoints = next;
        this.refreshSeconds = 30;
    }

    public String endpoint(String service) {
        return endpoints.get(service);
    }

    public int size() {
        return endpoints.size();
    }

    public int refreshSeconds() {
        return refreshSeconds;
    }
}
