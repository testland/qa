# We switched on container keep-alive and every local run still starts from scratch

## Problem Description

The inner loop on the search module is painful. `./mvnw verify -Dit.test=SearchIndexIT`
takes about 55 seconds, of which 40 is the search engine container starting and
the index being built. People run it maybe twice an hour instead of on every
change.

Somebody enabled the keep-alive setting so the container would survive between
runs. It made no difference at all: `docker ps` shows a brand new container id
after every run, and the 40 seconds are still there. The setting is clearly
active, because the log line about it appears on startup.

The same setting was added to the CI workflow's `env:` block "so both behave the
same". Since then the self-hosted runner occasionally has a container from an
earlier job still around with an index in it, and one job failed asserting on
documents no test in that job had indexed.

We want a fast local loop and we want CI to be unaffected by whatever we do to
get it.

## Output Specification

1. Make the container actually survive between local runs, so a second
   `./mvnw verify` on an unchanged working copy reuses the one already running.
2. Whatever makes that happen must be scoped to an individual developer's
   machine. The CI workflow must not opt into it, and a developer must not have
   to remember a flag on every command.
3. Changing the container's definition (a different image tag, a new environment
   variable) must produce a fresh container rather than silently attaching to the
   stale one.
4. `docs/local-integration.md` must describe the one-time step a developer does on
   their machine, and must not tell them to export anything into every shell.
5. Keep `SearchIndexIT`'s tests and assertions.

## Input Files

Extract the following files before beginning.

=============== FILE: src/test/java/com/example/SearchIndexIT.java ===============
package com.example;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;

class SearchIndexIT {

    static GenericContainer<?> search;
    static SearchClient client;

    @BeforeAll
    static void startSearchEngine() {
        search = new GenericContainer<>("opensearchproject/opensearch:2.17.1")
                .withExposedPorts(9200)
                .withEnv("discovery.type", "single-node")
                .withEnv("DISABLE_SECURITY_PLUGIN", "true")
                .waitingFor(Wait.forHttp("/_cluster/health")
                        .forStatusCode(200)
                        .withStartupTimeout(Duration.ofMinutes(2)))
                .withReuse(true);
        search.start();

        client = new SearchClient("http://" + search.getHost() + ":" + search.getMappedPort(9200));
        client.recreateIndex("catalog");
    }

    @AfterAll
    static void stopSearchEngine() {
        search.stop();
    }

    @Test
    void findsADocumentByTitle() {
        client.index("catalog", "doc-1", "{\"title\":\"blue mug\"}");
        client.refresh("catalog");

        List<String> hits = client.search("catalog", "blue");

        assertEquals(List.of("doc-1"), hits);
    }

    @Test
    void returnsNothingForAnUnknownTerm() {
        client.refresh("catalog");

        assertTrue(client.search("catalog", "zzzzzz").isEmpty());
    }
}

=============== FILE: .github/workflows/integration.yml ===============
name: integration
on:
  pull_request:
  push:
    branches: [main]

jobs:
  it:
    runs-on: [self-hosted, linux, x64]
    env:
      TESTCONTAINERS_REUSE_ENABLE: "true"
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
      - run: ./mvnw -B verify

=============== FILE: docs/local-integration.md ===============
# Running the integration tests locally

Start Docker Desktop, then:

```bash
./mvnw verify -Dit.test=SearchIndexIT
```

The search engine takes about 40 seconds to come up. To avoid paying that on
every run, add this to your `~/.bashrc` (or `~/.zshrc`) so every shell has it:

```bash
export TESTCONTAINERS_REUSE_ENABLE=true
```

Then restart your terminal. If a run behaves strangely, remove the container by
hand with `docker rm -f` and try again.
