package com.northwind.config;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/** Predates ConfigPublicationTest. Green on every build since 2025-08. */
class ConfigRegistryStressTest {

    private static final int THREADS = 32;
    private static final int ITERATIONS = 1_000_000;

    @Test
    void registryIsFullyPopulatedUnderConcurrentFirstAccess() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(THREADS);
        List<Future<?>> submitted = new ArrayList<>();

        for (int t = 0; t < THREADS; t++) {
            submitted.add(pool.submit(() -> {
                for (int i = 0; i < ITERATIONS; i++) {
                    ConfigRegistry registry = ConfigRegistry.get();
                    assertNotNull(registry);
                    assertEquals(3, registry.size());
                    assertEquals(30, registry.refreshSeconds());
                }
            }));
        }

        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.MINUTES);
    }
}
