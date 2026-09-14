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
    INTERVAL_MINUTES.put("vat-file-upload", 1440);
    INTERVAL_MINUTES.put("payout-post", 1440);
    INTERVAL_MINUTES.put("dunning-email", 1440);
    INTERVAL_MINUTES.put("metrics-rollup", 60);
    INTERVAL_MINUTES.put("session-prune", 15);
  }

  private SchedulerConfig() {}
}
