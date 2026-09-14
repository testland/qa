package com.acme.scheduler;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * The five triggers that ran on the Java service, with the interval each one
 * fired on. What each trigger did about a run it missed was configured per
 * trigger in scheduler.properties, which shipped with the service.
 */
public final class SchedulerConfig {

  public static final Map<String, Integer> INTERVAL_MINUTES = new LinkedHashMap<>();

  static {
    // One XML per period to the filing partner. Regulatory; every period must
    // be filed, and the partner holds one file per period.
    INTERVAL_MINUTES.put("vat-file-upload", 1440);

    // Posts the settlement batch for the period into the ledger.
    INTERVAL_MINUTES.put("payout-post", 1440);

    // Mails every customer whose invoice fell overdue in the period.
    INTERVAL_MINUTES.put("dunning-email", 1440);

    // Rebuilds the warehouse partition for the period from source.
    INTERVAL_MINUTES.put("metrics-rollup", 60);

    // Deletes sessions whose expiry has passed.
    INTERVAL_MINUTES.put("session-prune", 15);
  }

  private SchedulerConfig() {}
}
