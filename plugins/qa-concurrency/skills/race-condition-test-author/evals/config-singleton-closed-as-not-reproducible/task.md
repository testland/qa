# Ticket closed as not reproducible after 200 green runs, still happening in the fleet

## Problem Description

CFG-91 was closed in August. Jon wrote a stress test that hammers
`ConfigRegistry.get()` from 32 threads, a million iterations each, ran it 200
times on our CI fleet, never saw a failure, and closed the ticket as not
reproducible.

It is still happening. Since we started shifting nodes onto Graviton in
September we have 41 occurrences in six weeks, all on the arm64 pool, none on
the x86 pool. The shape is always the same: a request handler gets a non-null
registry back, `refreshSeconds()` returns 0 instead of 30, and endpoint lookups
come back null for a few hundred milliseconds after a cold start. Then it
resolves itself and the pod is fine for days.

Jon's position is that his test is the right test and we just have not run it
on the right hardware yet. His proposal is to raise the loop to a hundred
million iterations, run it on one of the arm64 runners overnight, and if that
is green too then the problem is somewhere else entirely and he will stop
looking. I would like to be able to argue with that properly rather than just
saying I have a bad feeling.

The platform team will take the change to `ConfigRegistry` itself in their own
pull request next week. They have asked me not to touch the class in the
meantime, because they are mid-review on it. What they want from me first is
something that can go red on this.

So: what I need is a check whose result I can actually interpret. If it comes
back green I want to know whether that means the problem is gone or only that
we did not happen to see it this time, and I want you to tell me which of those
two your deliverable gives me.

## Output Specification

1. Deliver the check, under `src/test/java/`. It must target the first-access
   publication path in `ConfigRegistry`.
2. State plainly, in the document below, whether a green result from your
   deliverable means "cannot happen" or "not observed this time".
3. `src/main/java/com/northwind/config/ConfigRegistry.java` must not be
   modified.
4. Repair `ConfigRegistryStressTest` so that a check failing inside one of its
   tasks actually fails the build. Keep the class name and the method name.
5. Add whatever build wiring the deliverable needs to `pom.xml`.
6. Write `docs/cfg-91-answer.md` addressing both Jon's August closure and his
   hundred-million-on-arm64 proposal, and saying what you would need to see
   before you agreed to close this again.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/CFG-91.md ===============
# CFG-91 - handlers occasionally see an unconfigured registry at cold start

## Symptom

For a few hundred milliseconds after a pod starts taking traffic, some request
handlers get a `ConfigRegistry` back from `get()` that is non-null but:

- `refreshSeconds()` returns `0` rather than `30`
- `endpoint("billing")` returns `null`
- `size()` returns `0`

After that window every handler on the pod is fine, indefinitely.

## History

- 2026-07-14 - opened, 6 occurrences on the x86 fleet over two months.
- 2026-08-21 - @jharlan: "Wrote ConfigRegistryStressTest. 32 threads, 1,000,000
  iterations each, checks the registry is fully populated on every call. Ran
  the suite 200 consecutive times on the CI fleet. Zero failures out of 200.
  Closing as not reproducible."
- 2026-09-02 - reopened. Graviton (arm64) migration began 2026-09-01.
- 2026-09-11 - 41 occurrences in six weeks. **All 41 on the arm64 node pool.
  None on the x86 pool in the same window.** Same traffic mix on both.

## Notes

- Every occurrence is within 400ms of the pod's first request.
- The JVM is 21.0.4 on both pools. Same image, same flags.
- @jharlan: "Same test, run long enough on arm64, will settle this either way.
  Give me a hundred million iterations overnight."

=============== FILE: pom.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.northwind</groupId>
  <artifactId>config-registry</artifactId>
  <version>3.2.0</version>

  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.10.2</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.2.5</version>
      </plugin>
    </plugins>
  </build>
</project>

=============== FILE: src/main/java/com/northwind/config/ConfigRegistry.java ===============
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

=============== FILE: src/test/java/com/northwind/config/ConfigRegistryTest.java ===============
package com.northwind.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;

class ConfigRegistryTest {

    @Test
    void returnsAPopulatedRegistry() {
        ConfigRegistry registry = ConfigRegistry.get();

        assertNotNull(registry);
        assertEquals(3, registry.size());
        assertEquals(30, registry.refreshSeconds());
        assertEquals("https://billing.internal:8443", registry.endpoint("billing"));
    }

    @Test
    void returnsTheSameRegistryEveryTime() {
        assertSame(ConfigRegistry.get(), ConfigRegistry.get());
    }
}

=============== FILE: src/test/java/com/northwind/config/ConfigRegistryStressTest.java ===============
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

/** 200 consecutive green runs on the CI fleet, 2026-08-21 -- @jharlan */
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
