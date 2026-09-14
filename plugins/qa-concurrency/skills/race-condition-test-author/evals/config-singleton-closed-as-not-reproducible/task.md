# Fifty million samples said the registry was fine and forty-one pods disagree

## Problem Description

CFG-91 was closed in August. Jon did not just point a loop at it — he wrote a
proper stress harness, `ConfigPublicationTest`, aimed it at the first-access
path in `ConfigRegistry`, and ran it for forty-one minutes. The run came back
with 50,000,000 samples and nothing flagged. He closed the ticket as not
reproducible and I did not argue at the time, because the report looked like
exactly the kind of evidence I keep asking people for.

It is still happening. Since we started shifting nodes onto Graviton in
September we have 41 occurrences in six weeks, all on the arm64 pool, none on
the x86 pool, same image and same traffic mix on both. The shape never varies:
a request handler gets a non-null registry back, `refreshSeconds()` returns 0
instead of 30, and `endpoint("billing")` comes back null for a few hundred
milliseconds after a cold start. Then it settles and the pod is fine for days.

Jon's position is that the harness is the right harness and that we have only
been running it on the wrong hardware. His proposal is to raise the run to eight
hours on one of the arm64 runners, and if that comes back the same way then the
problem is somewhere else entirely and he will stop looking. Before I sign off
on burning a runner overnight I want to understand what that report is actually
measuring, because I have fifty million samples of *something* and forty-one
production incidents, and I do not think those two numbers are about the same
event.

The platform team takes the change to `ConfigRegistry` itself in their own pull
request next week and has asked me not to touch the class while they are
mid-review. What they want from me first is a check that can go red.

There is also an older executor-based stress test in the tree from before Jon's
work. Nobody has looked at it in a year.

## Output Specification

1. Deliver the check under `src/test/java/`. It has to be able to observe the
   defect on the machine I am sitting at, in a run I can wait for.
2. `src/main/java/com/northwind/config/ConfigRegistry.java` must not be
   modified.
3. `ConfigPublicationTest` and `ConfigRegistryStressTest` are both in the tree.
   Keep their class names, and say for each whether it is worth keeping.
4. Write `docs/cfg-91-answer.md`: what Jon's August report does and does not
   establish, an answer to the eight-hours-on-arm64 proposal, and what you
   would need to see before you agreed to close CFG-91 again.

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
- 2026-08-21 - @jharlan: "Wrote ConfigPublicationTest against the first-access
  path. 50,000,000 samples in 41 minutes, nothing interesting, nothing failed.
  Report attached. Closing as not reproducible."
- 2026-09-02 - reopened. Graviton (arm64) migration began 2026-09-01.
- 2026-09-11 - 41 occurrences in six weeks. **All 41 on the arm64 node pool.
  None on the x86 pool in the same window.** Same traffic mix on both.

## Notes

- Every occurrence is within 400ms of the pod's first request.
- The JVM is 21.0.4 on both pools. Same image, same flags.
- @jharlan: "Same harness, eight hours on arm64, settles it either way."

=============== FILE: reports/stress-run-2026-08-21.txt ===============
# pasted out of Jon's terminal, 2026-08-21

Java Concurrency Stress Tests
-----------------------------------------------------------------------

*** FAILED tests
  Strong asserts were violated.

  0 matching test results.

*** INTERESTING tests
  Some interesting behaviours observed.

  0 matching test results.

*** All remaining tests

  com.northwind.config.ConfigPublicationTest

    RESULT        SAMPLES     FREQ                  EXPECT  DESCRIPTION
      0, 0              0    0.00%  ACCEPTABLE_INTERESTING  Empty registry; rare, self-heals
      3, 30    50,000,000  100.00%              ACCEPTABLE  Registry fully published

-----------------------------------------------------------------------
 1 test executed, 0 failed. Total runtime 00:41:18.

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
    <jcstress.version>0.16</jcstress.version>
    <uberjar.name>stressharness</uberjar.name>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.10.2</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.openjdk.jcstress</groupId>
      <artifactId>jcstress-core</artifactId>
      <version>${jcstress.version}</version>
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
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-shade-plugin</artifactId>
        <version>3.5.1</version>
        <executions>
          <execution>
            <phase>package</phase>
            <goals><goal>shade</goal></goals>
            <configuration>
              <finalName>${uberjar.name}</finalName>
              <transformers>
                <transformer implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
                  <mainClass>org.openjdk.jcstress.Main</mainClass>
                </transformer>
                <transformer implementation="org.apache.maven.plugins.shade.resource.ServicesResourceTransformer"/>
              </transformers>
            </configuration>
          </execution>
        </executions>
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

=============== FILE: src/test/java/com/northwind/config/ConfigPublicationTest.java ===============
package com.northwind.config;

import org.openjdk.jcstress.annotations.Actor;
import org.openjdk.jcstress.annotations.JCStressTest;
import org.openjdk.jcstress.annotations.Outcome;
import org.openjdk.jcstress.annotations.State;
import org.openjdk.jcstress.infra.results.II_Result;

import static org.openjdk.jcstress.annotations.Expect.ACCEPTABLE;
import static org.openjdk.jcstress.annotations.Expect.ACCEPTABLE_INTERESTING;

/** 50,000,000 samples, nothing interesting, 2026-08-21 -- @jharlan */
@JCStressTest
@Outcome(id = "3, 30", expect = ACCEPTABLE, desc = "Registry fully published")
@Outcome(id = "0, 0", expect = ACCEPTABLE_INTERESTING, desc = "Empty registry; rare, self-heals")
@State
public class ConfigPublicationTest {

    @Actor
    public void publisher() {
        ConfigRegistry.get();
    }

    @Actor
    public void reader(II_Result r) {
        ConfigRegistry c = ConfigRegistry.get();
        r.r1 = c.size();
        r.r2 = c.refreshSeconds();
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
